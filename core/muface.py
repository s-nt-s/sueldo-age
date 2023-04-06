import logging
from inspect import getmembers

import tabula

from .config import CFG
from .decorators import Cache
from .filemanager import FM
from .web import Web
import re
from os.path import isfile

logger = logging.getLogger(__name__)


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


class Muface:
    def __init__(self):
        self.root = CFG.muface.root
        self.years = {
            y: d for y, d in CFG.muface.items() if isinstance(y, int)
        }
        self.parsers = {}
        for n, f in getmembers(self):
            if n.startswith("parse_"):
                n = n.split("_")
                self.parsers[int(n[1])] = f
        if not self.parsers:
            raise Exception("No hay parseadores de muface")
        self.last_parser = max(self.parsers.keys())

    @Cache(file="dwn/muface/{}.json")
    def get(self, year):
        if year not in self.years:
            raise Exception(
                "No se ha encontrado retribuciones para el año %s, revise %s" % (year, self.root))
        url = self.years[year]
        file = "dwn/muface/%s.html" % year
        if not isfile(file):
            w = Web()
            w.get(url)
            FM.dump(file, w.soup)

        parse = getattr(self, "parse_"+str(year), None)
        if parse is None:
            logger.critical("No existe un parseador para el año {}. Se usará el último disponible {}".format(
                year, self.last_parser))
            parse = self.parsers[self.last_parser]

        return parse(file)

    def parse_2021(self, file):
        data = {}
        soup = FM.load(file)
        li = soup.find("li", text="Mutualistas obligatorios (cuota mensual):")
        ul = li.find_parent("ul")
        table = ul.find_next_sibling("table")
        for tr in table.select("tbody tr"):
            tds = tr.findAll("td")
            g = tds[0]
            g = g.get_text().strip().upper()
            g = g.split()[0]
            if len(g) < 3 and g[0] in ("A", "B", "C", "E"):
                c = tds[-1]
                c = to_num(c.get_text())
                data[g] = c
        return data
    

    def parse_2023(self, file):
        data = {}
        soup = FM.load(file)
        def findMutualistas(soup):
            for s in soup.findAll("strong"):
                if "Mutualistas obligatorios (cuota mensual):" in str(s):
                    return s.find_parent("li")
        li = findMutualistas(soup)
        ul = li.find_parent("ul")
        table = ul.find_next_sibling("table")
        for tr in table.select("tbody tr"):
            tds = tr.findAll("td")
            g = tds[0]
            g = g.get_text().strip().upper()
            g = g.split()[0]
            if len(g) < 3 and g[0] in ("A", "B", "C", "E"):
                c = tds[-1]
                c = to_num(c.get_text())
                data[g] = c
        return data
