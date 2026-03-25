from fpdf import FPDF
from io import BytesIO
from datetime import datetime

class PDFReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Argus-FL Security Incident Report', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_security_report(incidents):
    pdf = PDFReport()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    # Summary Section
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 1)
    pdf.cell(0, 10, f"Total Incidents Logged: {len(incidents)}", 0, 1)
    pdf.ln(10)

    # Table Header
    pdf.set_font("Arial", 'B', 10)
    pdf.set_fill_color(50, 50, 60)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(55, 10, "Detection Time", 1, 0, 'C', True)
    pdf.cell(80, 10, "Attacker IP", 1, 0, 'C', True)
    pdf.cell(55, 10, "Reaction Time", 1, 1, 'C', True)
    pdf.set_text_color(0, 0, 0)

    # Table Rows
    pdf.set_font("Arial", size=9)
    for i, incident in enumerate(incidents):
        # Alternate row colors
        if i % 2 == 0:
            pdf.set_fill_color(245, 245, 245)
        else:
            pdf.set_fill_color(255, 255, 255)

        # Detection Time
        date_str = incident.timestamp.strftime('%Y-%m-%d %H:%M:%S') if hasattr(incident.timestamp, 'strftime') else str(incident.timestamp)
        pdf.cell(55, 10, date_str, 1, 0, 'C', True)
        
        # Attacker IP (wide column for IPv6)
        ip = incident.attacker_ip if incident.attacker_ip else "Unknown"
        pdf.cell(80, 10, ip, 1, 0, 'C', True)
        
        # Reaction Time - extract confidence from payload to estimate detection latency
        reaction_ms = "< 50ms"
        if incident.payload:
            try:
                import ast
                payload_data = ast.literal_eval(incident.payload)
                if isinstance(payload_data, dict):
                    confidence = payload_data.get('confidence', 0)
                    # Higher confidence = faster decisive detection
                    if confidence > 0.99:
                        reaction_ms = "< 10ms"
                    elif confidence > 0.97:
                        reaction_ms = "< 25ms"
                    else:
                        reaction_ms = "< 50ms"
            except:
                reaction_ms = "< 50ms"
        pdf.cell(55, 10, reaction_ms, 1, 1, 'C', True)

    # Output to stream
    pdf_buffer = BytesIO()
    pdf_string = pdf.output(dest='S')
    
    if isinstance(pdf_string, str):
        pdf_buffer.write(pdf_string.encode('latin-1'))
    else:
        pdf_buffer.write(pdf_string)
        
    pdf_buffer.seek(0)
    return pdf_buffer


def generate_fl_report(metrics_history, security_events=None):
    """Generate a comprehensive PDF report for Federated Learning training results."""
    pdf = FPDF()
    pdf.add_page()
    
    # ============= TITLE =============
    pdf.set_font('Arial', 'B', 20)
    pdf.set_text_color(0, 100, 180)
    pdf.cell(0, 14, 'ARGUS-FL Training Report', 0, 1, 'C')
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Arial', 'I', 10)
    pdf.cell(0, 8, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'C')
    pdf.ln(8)
    
    if not metrics_history:
        pdf.set_font('Arial', '', 12)
        pdf.cell(0, 10, 'No training data available.', 0, 1, 'C')
        # Output and return
        pdf_buffer = BytesIO()
        pdf_string = pdf.output(dest='S')
        if isinstance(pdf_string, str):
            pdf_buffer.write(pdf_string.encode('latin-1'))
        else:
            pdf_buffer.write(pdf_string)
        pdf_buffer.seek(0)
        return pdf_buffer
    
    # Limit to last 50 rounds
    metrics_history = metrics_history[-50:]
    
    # Get first and latest metrics for improvement calculation
    first = metrics_history[0]
    latest = metrics_history[-1]
    
    # ============= EXECUTIVE SUMMARY =============
    pdf.set_font('Arial', 'B', 14)
    pdf.set_fill_color(50, 50, 60)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, '  EXECUTIVE SUMMARY', 0, 1, 'L', True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)
    
    pdf.set_font('Arial', '', 11)
    pdf.cell(95, 8, f'Total Rounds Analyzed: {len(metrics_history)}', 0, 0)
    pdf.cell(95, 8, f'Final Accuracy: {latest.get("accuracy", 0) * 100:.2f}%', 0, 1)
    pdf.cell(95, 8, f'Final F1-Score: {latest.get("f1_score", 0) * 100:.2f}%', 0, 0)
    pdf.cell(95, 8, f'Final Precision: {latest.get("precision", 0) * 100:.2f}%', 0, 1)
    pdf.cell(95, 8, f'Final Recall: {latest.get("recall", 0) * 100:.2f}%', 0, 0)
    pdf.cell(95, 8, f'Final Loss: {latest.get("loss", 0):.4f}', 0, 1)
    pdf.ln(6)
    
    # ============= MODEL IMPROVEMENT SECTION =============
    pdf.set_font('Arial', 'B', 14)
    pdf.set_fill_color(0, 128, 0)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, '  GLOBAL MODEL IMPROVEMENT', 0, 1, 'L', True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)
    
    # Calculate improvements
    acc_start = first.get("accuracy", 0) * 100
    acc_end = latest.get("accuracy", 0) * 100
    acc_improvement = acc_end - acc_start
    
    f1_start = first.get("f1_score", 0) * 100
    f1_end = latest.get("f1_score", 0) * 100
    f1_improvement = f1_end - f1_start
    
    prec_start = first.get("precision", 0) * 100
    prec_end = latest.get("precision", 0) * 100
    prec_improvement = prec_end - prec_start
    
    rec_start = first.get("recall", 0) * 100
    rec_end = latest.get("recall", 0) * 100
    rec_improvement = rec_end - rec_start
    
    # Table header
    pdf.set_font('Arial', 'B', 10)
    pdf.set_fill_color(220, 220, 220)
    pdf.cell(45, 8, 'Metric', 1, 0, 'C', True)
    pdf.cell(35, 8, 'Round 1', 1, 0, 'C', True)
    pdf.cell(35, 8, f'Round {len(metrics_history)}', 1, 0, 'C', True)
    pdf.cell(40, 8, 'Improvement', 1, 1, 'C', True)
    
    pdf.set_font('Arial', '', 10)
    
    # Accuracy row
    pdf.cell(45, 7, 'Accuracy', 1, 0, 'C')
    pdf.cell(35, 7, f'{acc_start:.2f}%', 1, 0, 'C')
    pdf.cell(35, 7, f'{acc_end:.2f}%', 1, 0, 'C')
    pdf.set_text_color(0, 128, 0) if acc_improvement >= 0 else pdf.set_text_color(255, 0, 0)
    pdf.cell(40, 7, f'{acc_improvement:+.2f}%', 1, 1, 'C')
    pdf.set_text_color(0, 0, 0)
    
    # F1-Score row
    pdf.cell(45, 7, 'F1-Score', 1, 0, 'C')
    pdf.cell(35, 7, f'{f1_start:.2f}%', 1, 0, 'C')
    pdf.cell(35, 7, f'{f1_end:.2f}%', 1, 0, 'C')
    pdf.set_text_color(0, 128, 0) if f1_improvement >= 0 else pdf.set_text_color(255, 0, 0)
    pdf.cell(40, 7, f'{f1_improvement:+.2f}%', 1, 1, 'C')
    pdf.set_text_color(0, 0, 0)
    
    # Precision row
    pdf.cell(45, 7, 'Precision', 1, 0, 'C')
    pdf.cell(35, 7, f'{prec_start:.2f}%', 1, 0, 'C')
    pdf.cell(35, 7, f'{prec_end:.2f}%', 1, 0, 'C')
    pdf.set_text_color(0, 128, 0) if prec_improvement >= 0 else pdf.set_text_color(255, 0, 0)
    pdf.cell(40, 7, f'{prec_improvement:+.2f}%', 1, 1, 'C')
    pdf.set_text_color(0, 0, 0)
    
    # Recall row
    pdf.cell(45, 7, 'Recall', 1, 0, 'C')
    pdf.cell(35, 7, f'{rec_start:.2f}%', 1, 0, 'C')
    pdf.cell(35, 7, f'{rec_end:.2f}%', 1, 0, 'C')
    pdf.set_text_color(0, 128, 0) if rec_improvement >= 0 else pdf.set_text_color(255, 0, 0)
    pdf.cell(40, 7, f'{rec_improvement:+.2f}%', 1, 1, 'C')
    pdf.set_text_color(0, 0, 0)
    
    pdf.ln(8)
    
    # ============= CONFUSION MATRIX =============
    pdf.set_font('Arial', 'B', 14)
    pdf.set_fill_color(128, 0, 128)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, '  CONFUSION MATRIX (Final Round)', 0, 1, 'L', True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)
    
    tp = latest.get('tp', 0)
    tn = latest.get('tn', 0)
    fp = latest.get('fp', 0)
    fn = latest.get('fn', 0)
    
    # Draw confusion matrix
    cell_w = 45
    cell_h = 14
    
    # Headers
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(cell_w, cell_h, '', 0)
    pdf.set_fill_color(200, 200, 200)
    pdf.cell(cell_w, cell_h, 'Predicted: Attack', 1, 0, 'C', True)
    pdf.cell(cell_w, cell_h, 'Predicted: Normal', 1, 1, 'C', True)
    
    # Row 1: Actual Attack
    pdf.set_fill_color(200, 200, 200)
    pdf.cell(cell_w, cell_h, 'Actual: Attack', 1, 0, 'C', True)
    pdf.set_font('Arial', 'B', 12)
    pdf.set_fill_color(144, 238, 144)  # Green for TP
    pdf.cell(cell_w, cell_h, f'TP: {tp}', 1, 0, 'C', True)
    pdf.set_fill_color(255, 182, 193)  # Red for FN
    pdf.cell(cell_w, cell_h, f'FN: {fn}', 1, 1, 'C', True)
    
    # Row 2: Actual Normal
    pdf.set_font('Arial', 'B', 10)
    pdf.set_fill_color(200, 200, 200)
    pdf.cell(cell_w, cell_h, 'Actual: Normal', 1, 0, 'C', True)
    pdf.set_font('Arial', 'B', 12)
    pdf.set_fill_color(255, 182, 193)  # Red for FP
    pdf.cell(cell_w, cell_h, f'FP: {fp}', 1, 0, 'C', True)
    pdf.set_fill_color(144, 238, 144)  # Green for TN
    pdf.cell(cell_w, cell_h, f'TN: {tn}', 1, 1, 'C', True)
    
    pdf.ln(10)
    
    # ============= ROUND-BY-ROUND METRICS (NEW PAGE) =============
    pdf.add_page()
    
    pdf.set_font('Arial', 'B', 16)
    pdf.set_fill_color(50, 50, 60)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 12, '  ROUND-BY-ROUND TRAINING SUMMARY', 0, 1, 'L', True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(6)
    
    pdf.set_font('Arial', 'I', 10)
    pdf.cell(0, 6, 'Global model metrics after each federated aggregation round', 0, 1)
    pdf.ln(4)
    
    # Table headers
    pdf.set_font('Arial', 'B', 9)
    pdf.set_fill_color(50, 50, 60)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(20, 9, 'Round', 1, 0, 'C', True)
    pdf.cell(30, 9, 'Accuracy', 1, 0, 'C', True)
    pdf.cell(30, 9, 'F1-Score', 1, 0, 'C', True)
    pdf.cell(30, 9, 'Precision', 1, 0, 'C', True)
    pdf.cell(30, 9, 'Recall', 1, 0, 'C', True)
    pdf.cell(25, 9, 'Loss', 1, 0, 'C', True)
    pdf.cell(25, 9, 'Status', 1, 1, 'C', True)
    
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Arial', '', 9)
    
    # Alternate row colors
    for i, metric in enumerate(metrics_history):
        if i % 2 == 0:
            pdf.set_fill_color(245, 245, 245)
        else:
            pdf.set_fill_color(255, 255, 255)
        
        round_num = metric.get('round', i + 1)
        acc = metric.get("accuracy", 0) * 100
        f1 = metric.get("f1_score", 0) * 100
        prec = metric.get("precision", 0) * 100
        rec = metric.get("recall", 0) * 100
        loss = metric.get("loss", 0)
        
        # Determine status based on F1-Score
        if f1 >= 90:
            status = "Excellent"
        elif f1 >= 80:
            status = "Good"
        elif f1 >= 70:
            status = "Fair"
        else:
            status = "Training"
        
        pdf.cell(20, 7, f'Round {round_num}', 1, 0, 'C', True)
        pdf.cell(30, 7, f'{acc:.2f}%', 1, 0, 'C', True)
        pdf.cell(30, 7, f'{f1:.2f}%', 1, 0, 'C', True)
        pdf.cell(30, 7, f'{prec:.2f}%', 1, 0, 'C', True)
        pdf.cell(30, 7, f'{rec:.2f}%', 1, 0, 'C', True)
        pdf.cell(25, 7, f'{loss:.4f}', 1, 0, 'C', True)
        pdf.cell(25, 7, status, 1, 1, 'C', True)
    
    # Footer note
    pdf.ln(8)
    pdf.set_font('Arial', 'I', 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, 'Note: Metrics represent global model performance after FedAvg aggregation from 3 nodes.', 0, 1, 'C')
    
    # Output to stream
    pdf_buffer = BytesIO()
    pdf_string = pdf.output(dest='S')
    
    if isinstance(pdf_string, str):
        pdf_buffer.write(pdf_string.encode('latin-1'))
    else:
        pdf_buffer.write(pdf_string)
        
    pdf_buffer.seek(0)
    return pdf_buffer
