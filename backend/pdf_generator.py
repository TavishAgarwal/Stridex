import os
import io
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import matplotlib.pyplot as plt
import matplotlib
import numpy as np

# Use non-interactive backend for server environments
matplotlib.use('Agg')

def create_metric_chart(title, x_data, y_data, y_label, color, hline=None, hline_label=None):
    """
    Generate a matplotlib chart and return it as a BytesIO object suitable for ReportLab.
    """
    fig, ax = plt.subplots(figsize=(6.5, 3))
    
    # Plotting
    ax.plot(x_data, y_data, color=color, linewidth=2)
    ax.fill_between(x_data, y_data, color=color, alpha=0.1)
    
    # Threshold Line
    if hline is not None:
        ax.axhline(y=hline, color='red', linestyle='--', alpha=0.7, label=hline_label)
        ax.legend(loc='upper right', fontsize=8)

    # Styling
    ax.set_title(title, fontsize=12, fontweight='bold', pad=10)
    ax.set_ylabel(y_label, fontsize=10)
    ax.set_xlabel("Time (seconds)", fontsize=10)
    ax.grid(True, linestyle=':', alpha=0.6)
    
    # Clean up spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    plt.tight_layout()
    
    # Save to memory buffer
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', dpi=150)
    img_buffer.seek(0)
    plt.close(fig)
    
    return img_buffer

def generate_session_report(session_data, coaching_recommendation):
    """
    Consumes raw session history and AI recommendations, returning a PDF buffer.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#0ea5e9'),
        spaceAfter=20
    )
    
    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#334155'),
        spaceBefore=15,
        spaceAfter=10,
        borderPadding=5
    )
    
    body_style = styles["Normal"]
    body_style.fontSize = 11
    body_style.leading = 14
    
    elements = []
    
    # Header
    elements.append(Paragraph("<b>STRIDEX AI Athlete Analytics</b>", title_style))
    date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    elements.append(Paragraph(f"<b>Session Generated:</b> {date_str}", body_style))
    elements.append(Spacer(1, 20))
    
    # AI Coaching Summary Table
    elements.append(Paragraph("AI Coaching Recommendation", h2_style))
    
    rec_text = coaching_recommendation.get('recommendation', 'N/A')
    reason_text = coaching_recommendation.get('reason', 'N/A')
    
    rec_color = colors.HexColor('#10b981') # Green default
    if rec_text == 'Substitute player':
        rec_color = colors.HexColor('#ef4444')
    elif rec_text in ['Reduce intensity', 'Consider rotation', 'Monitor closely']:
        rec_color = colors.HexColor('#f59e0b')
        
    summary_data = [
        ["Action Required:", Paragraph(f"<b>{rec_text.upper()}</b>", styles['Normal'])],
        ["AI Reasoning:", Paragraph(reason_text, styles['Normal'])]
    ]
    
    t = Table(summary_data, colWidths=[120, 380])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor('#f1f5f9')),
        ('BACKGROUND', (0,1), (0,1), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (1,0), (1,0), rec_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('INNERGRID', (0,0), (-1,-1), 0.25, colors.lightgrey),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 25))

    # --- Metrics Charts ---
    if not session_data:
        elements.append(Paragraph("<i>No telemetry data recorded for this session.</i>", body_style))
        doc.build(elements)
        buffer.seek(0)
        return buffer

    # Extract time series
    try:
        start_t = session_data[0].get('timestamp', 0)
        times = [max(0, d.get('timestamp', 0) - start_t) for d in session_data]
        
        risks = [d.get('risk_score', 0) for d in session_data]
        
        # Fatigue scores may not be present in all frame data formats
        fatigues = []
        for d in session_data:
            val = d.get('fatigue_score', d.get('fatigue', 0))
            try:
                fatigues.append(float(val))
            except (TypeError, ValueError):
                fatigues.append(0.0)
        
        # Asymmetry calculation over time
        # Some frames might just pass 0% string or float
        asyms = []
        for d in session_data:
            try:
                val = d.get('asymmetry', 0)
                if isinstance(val, str):
                    val = float(val.replace('%',''))
                asyms.append(float(val))
            except (ValueError, TypeError):
                asyms.append(0.0)
                
        # Generate Charts
        elements.append(Paragraph("Telemetry Breakdown", h2_style))
        
        # Risk Chart
        risk_img = create_metric_chart("Risk Score Progression", times, risks, "Risk %", "#ef4444", 70, "High Risk Threshold")
        elements.append(RLImage(risk_img, width=450, height=200))
        elements.append(Spacer(1, 10))
        
        # Fatigue Chart
        fatigue_img = create_metric_chart("Fatigue Saturation", times, fatigues, "Fatigue Index", "#f59e0b", 60, "Fatigue Warning")
        elements.append(RLImage(fatigue_img, width=450, height=200))
        elements.append(Spacer(1, 10))

        # Asymmetry Chart
        # Convert to numpy for smooth rolling average visualization to denoise frame reading jitter
        window = min(10, len(asyms))
        if len(asyms) >= window and window > 0:
            asym_smoothed = np.convolve(asyms, np.ones(window)/window, mode='valid')
            times_smoothed = times[window-1:]
            asym_img = create_metric_chart("Stride Asymmetry (Rolling Avg)", times_smoothed, asym_smoothed, "Asymmetry %", "#8b5cf6", 10, "Imbalance Threshold")
            elements.append(RLImage(asym_img, width=450, height=200))

    except Exception as e:
        elements.append(Paragraph(f"<i>Error generating charts: {str(e)}</i>", body_style))
    
    # Finalize
    doc.build(elements)
    buffer.seek(0)
    return buffer
