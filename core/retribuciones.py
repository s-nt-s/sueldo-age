import logging
import re
from inspect import getmembers
from io import StringIO

import tabula

from .config import CFG
from .decorators import Cache
from .filemanager import FM
from .web import Web

logger = logging.getLogger(__name__)

re_cellnb = re.compile(r'\s([\d\.,]+)\s')
re_sp = re.compile(r"\s+")


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


def parseTb(table):
    if table is None:
        return []
    s = StringIO()
    sep = '\t'
    table.to_csv(s, index=False, header=False, sep=sep)
    s = s.getvalue()
    s = s.strip()
    rows = []
    for r in s.split("\n"):
        r = re_cellnb.sub(lambda m: sep+m.group()+sep, r)
        r = r.strip()
        row = []
        for c in re.split(r"\s*\t\s*", r):
            c = to_num(c, safe=True)
            row.append(c)
        rows.append(row)
    return rows


class Retribuciones:
    def __init__(self):
        self.root = CFG.retribuciones.root
        self.years = {
            y: d for y, d in CFG.retribuciones.items() if isinstance(y, int)
        }
        self.parsers = {}
        for n, f in getmembers(self):
            if n.startswith("parse_"):
                n = n.split("_")
                self.parsers[int(n[1])] = f
        if not self.parsers:
            raise Exception("No hay parseadores de retribuciones")
        self.last_parser = max(self.parsers.keys())

    def populate_years(self):
        self.years = {}
        w = Web(verify=False)
        w.get(self.root)
        for a in w.soup.select("a[href]"):
            txt = a.get_text().strip()
            if txt.startswith("Retribuciones del personal funcionario"):
                txt = txt.replace("(", " (")
                yr = [int(i) for i in txt.split() if i.isdigit()]
                if yr and yr[0] > 2000:
                    url = a.attrs["href"]
                    yr = yr[0]
                    logger.debug("populate_years: %s: %s", yr, url)
                    self.years[yr] = url

    @Cache(file="dwn/retribuciones/{}.json")
    def get(self, year):
        if year not in self.years:
            self.populate_years()
        if year not in self.years:
            raise Exception(
                "No se ha encontrado retribuciones para el año %s, revise %s" % (year, self.root))
        url = self.years[year]
        file = "dwn/retribuciones/%s.pdf" % year
        FM.dwn(file, url, verify=False)

        parse = getattr(self, "parse_"+str(year), None)
        if parse is None:
            logger.critical("No existe un parseador para el año {}. Se usará el último disponible {}".format(
                year, self.last_parser))
            parse = self.parsers[self.last_parser]

        data = parse(file)
        if isinstance(data, dict):
            if len(data.keys()) == 0:
                return None
            if 0 == max(map(len, data.values())):
                return None
        return data

    def parse_2021(self, file):
        tableC = None
        tableS = None
        for t in tabula.read_pdf(file, pages=1, multiple_tables=True):
            if 'COMPLEMENTO DE DESTINO' in t.columns:
                tableC = t
            elif 'A2' in t.columns and 'A2' in t.columns and 'C1' in t.columns:
                tableS = t

        data = {}
        grupos = ("A1", "A2", "B", "C1", "C2", "E")
        for g in grupos:
            data[g] = {}
        for row in parseTb(tableS):
            if not(len(row) > 2 and isinstance(row[0], str) and isinstance(row[1], (int, float))):
                continue
            txt = row[0].replace(" ", '')
            sld = [r for i, r in enumerate(row[1:]) if i % 2 == 0]
            tri = [r for i, r in enumerate(row[1:]) if i % 2 == 1]
            key = None
            if txt.startswith("ANUAL"):
                key = "base"
            elif txt.startswith("PAGAEXTRAJUNIO"):
                key = "junio"
            elif txt.startswith("PAGAEXTRADICIEMBRE"):
                key = "diciembre"
            if key is None:
                continue
            for i, g in enumerate(grupos):
                data[g][key] = {
                    "sueldo": sld[i],
                    "trienio": tri[i]
                }

        data["niveles"] = {}
        for row in parseTb(tableC):
            if row[0] is None or not isinstance(row[0], int):
                continue
            row = [r for i, r in enumerate(row) if i % 2 == 0]
            row = iter(row)
            nivel = next(row)
            compd = next(row)
            data["niveles"][nivel] = compd

        return data

    def _parse_2022(self, file):
        tableC = None
        tableS = None
        for t in tabula.read_pdf(file, pages=1, multiple_tables=True):
            print(t.columns)
            if 'COMPLEMENTO DE DESTINO' in t.columns:
                tableC = t
            elif 'A2' in t.columns and 'A2' in t.columns and 'C1' in t.columns:
                tableS = t
        data = {}
        grupos = ("A1", "A2", "B", "C1", "C2", "E")
        for g in grupos:
            data[g] = {}
        for row in parseTb(tableS):
            if not(len(row) > 2 and isinstance(row[0], str) and isinstance(row[1], (int, float))):
                continue
            txt = row[0].replace(" ", '')
            key = None
            if txt.startswith("ANUAL"):
                key = "base"
            elif txt.startswith("PAGAEXTRAJUNIO"):
                key = "junio"
            elif txt.startswith("PAGAEXTRADICIEMBRE"):
                key = "diciembre"
            if key is None:
                continue
            cells = []
            for c in row[1:]:
                if isinstance(c, str) and ' ' in c:
                    for x in c.split():
                        cells.append(float(x.replace(".", "").replace(",", ".")))
                else:
                    cells.append(c)
            sld = [r for i, r in enumerate(cells) if i % 2 == 0]
            tri = [r for i, r in enumerate(cells) if i % 2 == 1]
            for i, g in enumerate(grupos):
                data[g][key] = {
                    "sueldo": sld[i],
                    "trienio": tri[i]
                }

        data["niveles"] = {}
        for row in parseTb(tableC or tableS):
            if row[0] is None or not isinstance(row[0], int):
                continue
            row = [r for i, r in enumerate(row) if i % 2 == 0]
            row = iter(row)
            nivel = next(row)
            compd = next(row)
            data["niveles"][nivel] = compd

        return data

    def parse_2022(self, file):
        data = {}
        grupos = ("A1", "A2", "B", "C1", "C2", "E")
        for g in grupos:
            data[g] = {}
        data["niveles"] = {}
        lines = {}
        page = FM.load_pdf(file, as_list=True, physical=True)[0]
        for line in page.split("\n"):
            line = line.strip()
            spl = line.split("     ", 1)
            if len(spl)!=2:
                continue
            cod = spl[0].strip()
            cod = re.sub(r"( ([A-Z])\b)+", lambda x: x.group().replace(" ",""), cod)
            val = re.findall(r"\d[\d\.,]+", spl[1].strip())
            val = tuple(map(lambda x: float(x.replace(".", "").replace(",", ".")), val))
            if len(val) < 2:
                continue
            lines[cod] = val

        for txt, cells in lines.items():
            key = None
            if txt.startswith("ANUAL"):
                key = "base"
            elif txt.startswith("PAGA EXTRA JUNIO"):
                key = "junio"
            elif txt.startswith("PAGA EXTRA DICIEMBRE"):
                key = "diciembre"
            if key is None:
                continue
            sld = [r for i, r in enumerate(cells) if i % 2 == 0]
            tri = [r for i, r in enumerate(cells) if i % 2 == 1]
            for i, g in enumerate(grupos):
                data[g][key] = {
                    "sueldo": sld[i],
                    "trienio": tri[i]
                }

        for txt, cells in lines.items():
            if not txt.isdigit():
                continue
            nivel = int(txt)
            compd = cells[1]
            data["niveles"][nivel] = compd

        return data
