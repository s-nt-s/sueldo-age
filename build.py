#!/usr/bin/env python3

from os.path import abspath, dirname
from os import chdir
import logging
import argparse
from core.retribuciones import Retribuciones
from core.muface import Muface
from core.rpt import RPT
from core.j2 import Jnj2
from core.config import CFG
from math import ceil
import bs4

abspath = abspath(__file__)
dname = dirname(abspath)
chdir(dname)

logging.basicConfig(
    level=logging.INFO,
    #format='%(asctime)s - %(levelname)s - %(message)s',
    format='%(levelname)s %(message)s',
    datefmt='%d-%b-%y %H:%M:%S'
)

def minmax(arr):
    arr=list(map(float, arr))
    r={
        "min":int(min(arr)),
        "max":ceil(max(arr))
    }
    return r

rt=Retribuciones()
r=rt.get(CFG.retribuciones.last)
mf=Muface()
m=mf.get(CFG.muface.last)
rp=RPT()
t=rp.get()

sueldo=set()
extra=set()
especifico=set()
for k, v in r.items():
    if isinstance(v, dict) and "base" in v:
        sueldo.add(v["base"]["sueldo"])
        extra.add(v["junio"]["sueldo"])
        extra.add(v["diciembre"]["sueldo"])

def post_render(html, **kwargs):
    soup = bs4.BeautifulSoup(html, 'lxml')
    for i in soup.findAll(["input", "select"]):
        id = i.attrs.get("id")
        if id is not None and "name" not in i.attrs:
            i.attrs["name"]=id
    for i, f in enumerate(soup.findAll("form")):
        pre = "f%s_" % (i+1)
        for l in f.findAll("label"):
            fr = l.attrs.get("for")
            if fr is not None:
                l.attrs["for"]=pre+l.attrs["for"]
        for l in f.select("*[id]"):
            fr = l.attrs.get("id")
            if fr is not None:
                l.attrs["id"]=pre+l.attrs["id"]
    for a in soup.findAll("a"):
        href = a.attrs.get("href")
        if href is None:
            continue
        if href.startswith("#"):
            id = href[1:]
            nt = soup.find(None, id=id)
            a.attrs["title"]=nt.get_text().strip()
        else:
            a.attrs["target"]="_blank"
    return str(soup)

j = Jnj2("template/", "docs/", post=post_render)
j.create_script("rec/js/00-data.js",
    muface=m,
    retribuciones=r
)
j.save("index.html",
    rpt=minmax(t.keys()),
    nivel=minmax(r["niveles"].keys()),
    sueldo=minmax(sueldo),
    extra=minmax(extra),
    muface=minmax(m.values()),
    cdestino=minmax(r["niveles"].values()),
    especifico=minmax(p["complemento"] for p in t.values()),
    grupos=("A1", "A2", "B", "C1", "C2", "E"),
    cfg=CFG
)
