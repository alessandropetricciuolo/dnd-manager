"""Local prototype: existing generator data plus verbatim manual excerpts."""
import json, re, hashlib
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.pagesizes import A4

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/bardo-prototipo'
s=json.loads((OUT/'dati-generatore.json').read_text())['sheet']
assert s['classLabel']=='Bardo' and s['level']==5 and s['classSubclass']=='Collegio della Sapienza'
source=ROOT/'public/manuals/manuale_giocatore.md'
md=source.read_text()
chapter=md[md.index('## ISPIRAZIONE BARDICA'):md.index('### SEGRETI MAGICI AGGIUNTIVI')]
def excerpt(title, count=None):
    m=re.search(r'^#{1,6} '+re.escape(title)+r'\s*\n(.*?)(?=^#{1,6} |\Z)',chapter,re.M|re.S)
    assert m, title
    t=re.sub(r'!\[[^\]]*\]\([^)]*\)','',m[1])
    t=re.sub(r'^CAPITOLO 3 \| CLASSI\s*$|^\d+\s*$','',t,flags=re.M)
    t=re.sub(r'\n\s*\n+', '\n\n',t).strip().replace('Può scegliere\n\ndi utilizzare','Può scegliere di utilizzare')
    return '\n\n'.join(t.split('\n\n')[:count]) if count else t
blocks=[(t,excerpt(t,n)) for t,n in [('ISPIRAZIONE BARDICA',2),('FONTE DI ISPIRAZIONE',None),('PAROLE TAGLIENTI',None),('CANTO DI RIPOSO',1),('FACTOTUM',None),('MAESTRIA',1),('COMPETENZE BONUS',None)]]
# Keep the original base-die wording, with its explicit level progression alongside it.
progression=excerpt('ISPIRAZIONE BARDICA').split('\n\n')[-1]
blocks[0]=(blocks[0][0],blocks[0][1]+'\n\n'+progression)
assert 'd8 al 5° livello' in excerpt('ISPIRAZIONE BARDICA')
assert 'modificatore di Carisma' in excerpt('ISPIRAZIONE BARDICA')
assert '1d6 punti ferita extra' in excerpt('CANTO DI RIPOSO')
uses=max(1,s['abilityMods']['cha'])
(OUT/'fonti.json').write_text(json.dumps({'file':str(source),'sha256':hashlib.sha256(md.encode()).hexdigest(),'blocks':blocks,'resourceEvidence':{t:excerpt(t) for t in ['ISPIRAZIONE BARDICA','FONTE DI ISPIRAZIONE','CANTO DI RIPOSO']}},ensure_ascii=False,indent=2))
W,H=A4
c=canvas.Canvas(str(OUT/'Bardo-prima-pagina.pdf'),pagesize=A4)
c.setTitle('Barber & Dragons | Bardo - prototipo di stampa')
ink=HexColor('#252525'); gray=HexColor('#666666'); light=HexColor('#eeeeeb')
x1,x2,x3=22,185,372
w1,w2,w3=153,177,201
def text(x,y,t,size=9,font='Helvetica',color=ink):
    c.setFillColor(color); c.setFont(font,size); c.drawString(x,H-y-size,str(t))
def line(x,y,xx,yy):
    c.setStrokeColor(ink); c.setLineWidth(.55); c.line(x,H-y,xx,H-yy)
def box(x,y,w,h,title):
    c.setStrokeColor(ink); c.setLineWidth(.65); c.roundRect(x,H-y-h,w,h,4,stroke=1,fill=0)
    c.setFillColor(light); c.rect(x+.5,H-y-20,w-1,19,stroke=0,fill=1)
    text(x+7,y+5,title,8,'Helvetica-Bold')
def paragraph(t,size=8,leading=10):
    return Paragraph(escape(t).replace('\n\n','<br/><br/>'),ParagraphStyle('p',fontName='Helvetica',fontSize=size,leading=leading,textColor=ink))
def para(x,y,w,t,size=8,leading=10):
    p=paragraph(t,size,leading); _,h=p.wrap(w,10000); p.drawOn(c,x,H-y-h); return h
def circles(x,y,n):
    c.setStrokeColor(ink); c.setLineWidth(.7)
    for i in range(n): c.circle(x+i*15,H-y,4,stroke=1,fill=0)
def stat(x,y,w,label,value):
    box(x,y,w,52,label); text(x+9,y+23,value,19,'Times-Bold')
def signed(v): return f'{v:+d}'
text(22,19,'BARBER & DRAGONS',10,'Helvetica-Bold')
text(22,36,'Liro',29,'Times-Bold')
text(22,70,'Halfling / Artista / Personaggio di esempio',8,color=gray)
text(372,21,'BARDO',27,'Times-Bold')
text(372,54,'LIVELLO 5 / COLLEGIO DELLA SAPIENZA',7.4,'Helvetica-Bold')
line(22,92,573,92)
for x,t in [(x1,'01  CARATTERISTICHE'),(x2,'02  COMBATTIMENTO E RISORSE'),(x3,'03  PRIVILEGI DEL BARDO')]: text(x,100,t,8,'Helvetica-Bold')
stat(x1,119,72,'COMPETENZA',signed(s['proficiencyBonus']))
stat(x1+81,119,72,'PERC. PASSIVA',s['passivePerception'])
abilities=[('str','FORZA',[('athletics','Atletica')]),('dex','DESTREZZA',[('acrobatics','Acrobazia'),('stealth','Furtività'),('sleight_of_hand','Rapidità di mano')]),('con','COSTITUZIONE',[]),('int','INTELLIGENZA',[('arcana','Arcano'),('investigation','Indagare'),('nature','Natura'),('religion','Religione'),('history','Storia')]),('wis','SAGGEZZA',[('animal_handling','Addestrare animali'),('insight','Intuizione'),('medicine','Medicina'),('perception','Percezione'),('survival','Sopravvivenza')]),('cha','CARISMA',[('deception','Inganno'),('intimidation','Intimidire'),('performance','Intrattenere'),('persuasion','Persuasione')])]
y=181
for key,label,skills in abilities:
    h=45+len(skills)*13
    box(x1,y,w1,h,label)
    text(x1+8,y+24,s['abilities'][key],20,'Times-Bold')
    text(x1+37,y+29,signed(s['abilityMods'][key]),11,'Helvetica-Bold')
    text(x1+70,y+26,'Salvezza '+signed(s['savingThrows'][key]['value']),8)
    for i,(k,lbl) in enumerate(skills):
        v=s['skills'][k]; marker='M' if v.get('expertise') else ('C' if v['proficient'] else '-')
        text(x1+8,y+45+i*13,marker,7,color=gray); text(x1+22,y+44+i*13,lbl,8)
        text(x1+126,y+44+i*13,signed(v['value']),8,'Helvetica-Bold')
    y+=h+8
text(x1,y,'C competenza / M maestria',7,color=gray)
para(x1,y+16,w1,'Lingue: '+', '.join(s['languages']))
for i,(label,v) in enumerate([('CA',s['armorClass']),('INIZIATIVA',signed(s['initiative'])),('VELOCITÀ',s['speed'])]): stat(x2+i*61,119,55,label,v)
box(x2,181,w2,83,'PUNTI FERITA')
text(x2+8,208,'MAX '+str(s['hpMax']),13,'Helvetica-Bold'); text(x2+90,210,'ATTUALI',7,color=gray)
line(x2+86,244,x2+w2-9,244); text(x2+8,244,'Temporanei: __________',8)
box(x2,274,w2,77,'DADI VITA / SALVEZZA DA MORTE')
text(x2+8,301,f"{s['hitDiceTotal']} {s['hitDie']}   Usati: ______",10)
text(x2+8,323,'Successi',7); circles(x2+70,328,3)
text(x2+8,337,'Fallimenti',7); circles(x2+70,342,3)
box(x2,361,w2,85,'ATTACCHI')
for i,a in enumerate(s['weaponRows']):
    text(x2+8,389+i*24,a['name'],9,'Helvetica-Bold')
    text(x2+75,389+i*24,a['toHit']+' / '+a['damage'],8)
    text(x2+75,400+i*24,a['type'],6.8,color=gray)
box(x2,456,w2,88,'ISPIRAZIONE BARDICA')
text(x2+9,483,'d8',26,'Times-Bold'); text(x2+65,485,f'{uses} utilizzi',12,'Helvetica-Bold')
circles(x2+70,516,uses); text(x2+8,530,'Recupero: riposo breve o lungo',7.8)
box(x2,554,w2,54,'CANTO DI RIPOSO')
text(x2+9,580,'1d6',18,'Times-Bold'); text(x2+65,584,'PF extra - vedi regola',7.8)
box(x2,618,w2,108,'INCANTESIMI')
text(x2+8,644,f"CD {s['spellSaveDc']}    Attacco {signed(s['spellAttackBonus'])}",10,'Helvetica-Bold')
for i,(lvl,n) in enumerate((k,v) for k,v in s['spellSlots'].items() if v):
    text(x2+8,665+i*17,f'{lvl}° livello',8); circles(x2+75,672+i*17,n)
box(x2,736,w2,48,'NOTE / ISPIRAZIONE')
line(x2+8,771,x2+w2-8,771)
y=119; overflow=[]
for title,body in blocks:
    p=paragraph(body,7.7,9.4); _,h=p.wrap(w3-14,10000); total=h+30
    if y+total>740:
        overflow.append((title,body)); continue
    box(x3,y,w3,total,title); p.drawOn(c,x3+7,H-y-24-h); y+=total+8
if overflow:
    text(x3,y+1,'CONTINUA A PAGINA 2',8,'Helvetica-Bold')
    para(x3,y+16,w3,', '.join(t.capitalize() for t,b in overflow))
line(22,797,573,797)
text(22,804,'PROTOTIPO GRAFICO - dati del generatore; abilità da verificare (Factotum / competenze bonus).',7,color=gray)
text(22,816,'Valori prestampati; cerchi e spazi bianchi da annotare a matita. | 1',7,color=gray)
c.showPage()
if overflow:
    text(30,28,'BARDO / RIFERIMENTI',22,'Times-Bold')
    text(30,61,'Continuazione delle capacità - testo estratto dal manuale del progetto',9)
    y=100
    for title,body in overflow:
        text(30,y,title,10,'Helvetica-Bold'); y+=23
        y+=para(30,y,535,body,10,14)+25
    assert y<770, 'Reference overflow'
    text(30,780,'Fonte: Manuale del Giocatore, capitolo Bardo / Collegio della Sapienza.',8,color=gray)
    text(30,799,'Prototipo: valori conservati dal generatore esistente. | 2',8,color=gray)
    c.showPage()
c.save()
print('Generated',OUT/'Bardo-prima-pagina.pdf','continuations:',len(overflow))
