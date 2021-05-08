#!/usr/bin/env python3

import logging
from math import ceil
from os import chdir
from os.path import abspath, dirname
import re

import bs4

from core.config import CFG
from core.j2 import Jnj2
from core.muface import Muface
from core.retribuciones import Retribuciones
from core.rpt import RPT

abspath = abspath(__file__)
dname = dirname(abspath)
chdir(dname)

logging.basicConfig(
    level=logging.INFO,
    #format='%(asctime)s - %(levelname)s - %(message)s',
    format='%(levelname)s %(message)s',
    datefmt='%d-%b-%y %H:%M:%S'
)

GRUPOS = ("A1", "A2", "B", "C1", "C2", "E")
rtb = Retribuciones().get(CFG.retribuciones.last)
mfc = Muface().get(CFG.muface.last)
rpt = RPT().get()
NIVELES = list(map(int, rtb["niveles"].keys()))


def minmax(arr):
    arr = list(map(float, arr))
    r = {
        "min": int(min(arr)),
        "max": ceil(max(arr))
    }
    return r


def get_mode(arr, k):
    if arr is None:
        return None
    count = {}
    for a in arr:
        a = a[k]
        count[a] = count.get(a, 0) + 1
    if len(count) == 0:
        return None
    arr = sorted(count.items(), key=lambda x: (-x[1], x[0]))
    return arr[0][0]


g_rpt = {g: [] for g in GRUPOS}
for i in rpt.values():
    g = i["grupo"]
    if g in GRUPOS:
        g_rpt[g].append(i)

moda = {}
for g in GRUPOS:
    moda[g] = {}
    nvl = get_mode(g_rpt[g], "nivel")
    if nvl is not None:
        moda[g]["nivel"] = nvl
    for n in NIVELES:
        aux = (i for i in g_rpt[g] if i["nivel"] == n)
        cp = get_mode(aux, "complemento")
        if cp is not None:
            moda[g][n] = cp
    if len(moda[g]) == 0:
        del moda[g]

sueldo = set()
extra = set()
especifico = set()
for k, v in rtb.items():
    if isinstance(v, dict) and "base" in v:
        sueldo.add(v["base"]["sueldo"])
        extra.add(v["junio"]["sueldo"])
        extra.add(v["diciembre"]["sueldo"])


def post_render(html, **kwargs):
    soup = bs4.BeautifulSoup(html, 'lxml')
    for i in soup.findAll(["input", "select"]):
        id = i.attrs.get("id")
        if id is not None and "name" not in i.attrs:
            i.attrs["name"] = id
    for i, f in enumerate(soup.findAll("form")):
        pre = "f%s_" % (i+1)
        for l in f.findAll("label"):
            fr = l.attrs.get("for")
            if fr is not None:
                l.attrs["for"] = pre+l.attrs["for"]
        for l in f.select("*[id]"):
            fr = l.attrs.get("id")
            if fr is not None:
                l.attrs["id"] = pre+l.attrs["id"]
    for a in soup.findAll("a"):
        href = a.attrs.get("href")
        if href is None:
            continue
        if re.match(r"^#n\d+$", href):
            id = href[1:]
            nt = soup.find(None, id=id)
            a.attrs["title"] = nt.get_text().strip()
        if not href.startswith("#"):
            a.attrs["target"] = "_blank"
    return str(soup)


j = Jnj2("template/", "docs/", post=post_render)
j.create_script("rec/js/00-lib/data.js",
                MUFACE=mfc,
                RETRIB=rtb,
                MODA=moda
                )
j.save("index.html",
       rpt=minmax(rpt.keys()),
       nivel=minmax(NIVELES),
       sueldo=minmax(sueldo),
       extra=minmax(extra),
       muface=minmax(mfc.values()),
       cdestino=minmax(rtb["niveles"].values()),
       especifico=minmax(p["complemento"] for p in rpt.values()),
       grupos=GRUPOS,
       cfg=CFG
       )
