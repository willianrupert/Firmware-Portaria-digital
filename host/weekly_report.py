import sqlite3
import smtplib
import os
from email.mime.text import MIMEText
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'deliveries.db')

def generate_report():
    try:
        conn = sqlite3.connect(DB_PATH)
        week_ago = int((datetime.now() - timedelta(days=7)).timestamp())
        rows = conn.execute(
            "SELECT carrier, weight_g FROM deliveries WHERE ts > ?",
            (week_ago,)
        ).fetchall()

        total = len(rows)
        carriers = {}
        total_weight = 0.0
        for r in rows:
            carriers[r[0]] = carriers.get(r[0], 0) + 1
            total_weight += r[1]

        report_body = f"""Resumo Semanal - Portaria Autónoma RLight
        
Total de Encomendas Recebidas: {total}
Peso Total Processado: {total_weight:.2f}g
        
Por transportadora:
"""
        for k, v in carriers.items():
            report_body += f"- {k}: {v} pacote(s)\n"

        return report_body
    except Exception as e:
        return f"Erro ao gerar relatório: {e}"

def send_email(body):
    # SMTP Mock. Em prod seria puxado configs do HA ou ENV files.
    # config_email = "..." 
    print(f"[Weekly Report] E-mail simulado enviado com o corpo:\n{body}")

if __name__ == "__main__":
    relatorio = generate_report()
    send_email(relatorio)
