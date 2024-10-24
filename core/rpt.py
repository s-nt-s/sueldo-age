import logging
import re

from xlrd import open_workbook

from .config import CFG
from .decorators import Cache
from .filemanager import FM
from .web import Web
import functools
from typing import NamedTuple, List

logger = logging.getLogger(__name__)

re_space = re.compile(r"  +")
re_number = re.compile(r"^\d+,\d+$")


def to_num(s, safe=False):
    if s is None:
        return None
    if safe is True:
        try:
            return to_num(s)
        except ValueError:
            return s
    if isinstance(s, str):
        s = s.replace("€", "")
        s = s.replace(".", "")
        s = s.replace(",", ".")
        s = float(s)
    if int(s) == s:
        s = int(s)
    return s


def parse_cell(cell, parse_number=True):
    if not cell:
        return None
    v = cell.value
    if isinstance(v, float):
        return int(v) if v.is_integer() else v
    if isinstance(v, str):
        v = v.strip()
        if v.isdigit():
            return int(v)
        v = re_space.sub(" ", v)
        v = v.replace("PROGRAMDOR", "PROGRAMADOR")
        if parse_number and re_number.match(v):
            v = float(v.replace(",", "."))
            return int(v) if v.is_integer() else v
        return v if len(v) else None
    return v


class Row(NamedTuple):
    puesto: int
    grupo: str
    nivel: int
    complemento: float
    ministerio: int
    direccion: int
    unidad: int


class Complemento(NamedTuple):
    complemento: float
    grupo: str
    nivel: int
    ministerio: int
    direccion: int
    unidad: int


class RPT:
    def __init__(self):
        self.root = CFG.rpt.root

    @functools.cache
    def __get_rows(self):
        w = Web()
        w.get(self.root)
        done = set()
        files = set()
        urls = set(a.attrs["href"]
                   for a in w.soup.select("#cont_gen div.title-item-div a"))
        for url in sorted(urls):
            org = url.rsplit("-", 1)
            org = org[-1]
            org = org.rsplit(".", 1)
            org = org[0]
            prefix = "dwn/rpt/"+org+"."
            w.get(url)
            for a in w.soup.select("ul.list-generic a.link-external"):
                li = a.find_parent("li")
                if "personal funcionario" not in li.get_text().lower():
                    continue
                url = a.attrs["href"]
                if url in done:
                    continue
                done.add(url)
                ext = url.rsplit(".", 1)[-1]
                ext = ext.lower()
                if ext in ("xls", "xlsx", "csv"):
                    file = prefix+ext
                    files.add(file)
                    FM.dwn(file, url, headers=w.s.headers)

        def get_val(file, data, *args):
            for k in args:
                if k in data:
                    return data[k]
            raise Exception(file+" no tiene ningún campo: " + ", ".join(args))

        rows: List[Row] = []
        for file in sorted(files):
            head = None
            wb = open_workbook(file)
            sh = wb.sheet_by_index(0)
            for rx in range(sh.nrows):
                row = [parse_cell(c) for c in sh.row(rx)]
                if len(row) < 2:
                    continue
                if not isinstance(row[0], int):
                    head = row
                else:
                    row = {k: v for k, v in zip(head, row)}
                    rows.append(Row(
                        puesto=get_val(file, row, "Puesto"),
                        grupo=get_val(file, row, "Gr/Sb"),
                        nivel=get_val(file, row, "Nivel"),
                        complemento=get_val(file, row, "C.Específ."),
                        ministerio=get_val(file, row, "Minis."),
                        direccion=get_val(file, row, "C.Dir"),
                        unidad=get_val(file, row, "Unidad"),
                    ))
        return rows

    @Cache(file="dwn/rpt/puestos.json", maxOld=1)
    def get(self):
        data = {}
        for row in self.__get_rows():
            data[row.puesto] = {
                "grupo": row.grupo,
                "nivel": row.nivel,
                "complemento": row.complemento
            }
        return data

    @Cache(file="dwn/rpt/complemetos.json", maxOld=1)
    def complemetos(self):
        data = set()
        for row in self.__get_rows():
            data.add(Complemento(
                complemento=row.complemento,
                grupo=row.grupo,
                nivel=row.nivel,
                ministerio=row.ministerio,
                direccion=row.direccion,
                unidad=row.unidad
            ))
        return sorted(data, key=lambda x: x.complemento)


if __name__ == "__main__":
    RPT().complemetos()
