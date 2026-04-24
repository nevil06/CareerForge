"""
PDF Resume Generator — clean, professional, ATS-friendly
Uses reportlab to convert tailored resume text into a polished PDF.
"""
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_CENTER


def generate_resume_pdf(resume_text: str, candidate_name: str) -> bytes:
    """
    Convert plain text resume into a clean PDF.
    Returns PDF bytes ready to download.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor='#1f2937',
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=13,
        textColor='#4f6ef7',
        spaceBefore=12,
        spaceAfter=6,
        fontName='Helvetica-Bold',
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        textColor='#374151',
        leading=14,
        spaceAfter=8,
    )

    story = []
    
    # Title (candidate name)
    story.append(Paragraph(candidate_name.upper(), title_style))
    story.append(Spacer(1, 0.1*inch))

    # Parse resume text into sections
    lines = resume_text.split('\n')
    current_section = []
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_section:
                story.append(Paragraph('<br/>'.join(current_section), body_style))
                current_section = []
            continue
        
        # Detect section headers (all caps or ends with colon)
        if line.isupper() or (line.endswith(':') and len(line) < 40):
            if current_section:
                story.append(Paragraph('<br/>'.join(current_section), body_style))
                current_section = []
            story.append(Paragraph(line.rstrip(':'), heading_style))
        else:
            # Escape HTML special chars
            line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            current_section.append(line)
    
    # Flush remaining
    if current_section:
        story.append(Paragraph('<br/>'.join(current_section), body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
