from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

OUT=Path(__file__).resolve().parents[1]/"sample-data"
OUT.mkdir(exist_ok=True)

def pdf(name,title,lines):
    c=canvas.Canvas(str(OUT/name),pagesize=A4)
    y=800;c.setFont("Helvetica-Bold",16);c.drawString(50,y,title);y-=35
    c.setFont("Helvetica",11)
    for line in lines:
        for part in [line[i:i+95] for i in range(0,len(line),95)]:
            c.drawString(50,y,part);y-=18
            if y<60:c.showPage();y=800;c.setFont("Helvetica",11)
    c.save()

pdf("demo_tender.pdf","GeM Demo Tender",[
"AI-enabled office equipment procurement — Tender Requirements",
"Bidder must be registered with a valid GST number.",
"Bidder must have at least 3 years of relevant experience.",
"Minimum annual turnover must be INR 50 lakh.",
"Product must include a minimum 1-year warranty.",
"Bidder must submit PAN details.",
"Technical specification compliance declaration must be submitted.",
"Bidder must submit an authorized signatory declaration."
])
pdf("demo_bidder_alpha.pdf","Alpha Systems — Bid Submission",[
"Bidder Information",
"GSTIN: 27ABCDE1234F1Z5",
"PAN: ABCDE1234F",
"Experience: 5 years in relevant government procurement.",
"Annual turnover: INR 75 lakh.",
"Product warranty: 1 year.",
"Technical specification compliance declaration: Submitted and signed.",
"Authorized signatory declaration: Submitted."
])
pdf("demo_bidder_beta.pdf","Beta Technologies — Bid Submission",[
"Bidder Information",
"GSTIN: 27ABCDE9876G1Z4",
"PAN: XYZAB5678Q",
"Experience: 2 years in relevant procurement.",
"Annual turnover: INR 42 lakh.",
"Product warranty: 1 year.",
"Technical specification compliance declaration: Submitted.",
"Authorized signatory declaration: Submitted."
])
print("Created demo PDFs in",OUT)
