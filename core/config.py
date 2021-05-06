from munch import Munch
from os.path import dirname
from .filemanager import FM

CFG = FM.load("index.yml")

for k, d in CFG.items():
    y = max((y for y in d.keys() if isinstance(y, int)), default=0)
    if y>0:
        CFG[k]["last"] = y
CFG = Munch.fromDict(CFG)
