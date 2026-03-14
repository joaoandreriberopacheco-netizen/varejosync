<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprovante VarejoSync</title>
    
    <style>
        /* ------------------------------------------
           1. ESTILOS GLOBAIS (Base para ambos)
           ------------------------------------------ */
        * { box-sizing: border-box; }
        
        body {
            background-color: #e5e7eb;
            font-family: 'Courier New', Courier, monospace; 
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .botoes-acao {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }

        button {
            padding: 10px 15px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            cursor: pointer;
            border: 1px solid #000;
            background: #fff;
            border-radius: 4px;
        }
        
        button:hover { background: #f0f0f0; }
        .btn-black { background: #000; color: #fff; }
        .btn-black:hover { background: #333; }

        #recibo {
            background-color: #fff;
            color: #000;
            line-height: 1.2;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .t-center { text-align: center; }
        .t-right { text-align: right; }
        .t-left { text-align: left; }
        .bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }

        /* Linha Tracejada Única e Elegante */
        .linha-separadora {
            border-bottom: 1px dashed #000;
            margin: 6px 0;
        }

        /* Tabela Minimalista */
        table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        th { font-weight: bold; padding: 4px 0 2px 0; border-bottom: 1px dashed #000; text-align: right; }
        td { text-align: right; vertical-align: top; padding: 4px 0; }
        th:first-child, td:first-child { text-align: left; width: 50%; }

        .flex-linha { display: flex; justify-content: space-between; margin-bottom: 2px; }

        /* ------------------------------------------
           2. FORMATO TÉRMICA (80mm)
           ------------------------------------------ */
        .formato-termica {
            width: 270px; 
            font-size: 11px;
            padding: 10px;
        }

        /* ------------------------------------------
           3. FORMATO A4
           ------------------------------------------ */
        .formato-a4 {
            width: 100%;
            max-width: 800px; 
            font-size: 14px;  
            padding: 30px 40px;
        }

        /* ------------------------------------------
           4. REGRAS DE IMPRESSÃO
           ------------------------------------------ */
        @media print {
            body { background: transparent; padding: 0; display: block; }
            .botoes-acao { display: none !important; }
            #recibo { box-shadow: none !important; margin: 0 !important; }
            .formato-a4 { max-width: none; padding: 0; }
        }
    </style>

    <style id="estilo-impressao-dinamico"></style>
</head>
<body>

    <div class="botoes-acao no-print">
        <button onclick="imprimir('termica')" class="btn-black">🖨️ Imprimir Térmica (80mm)</button>
        <button onclick="imprimir('a4')">📄 Imprimir Folha A4</button>
    </div>

    <div id="recibo" class="formato-termica">
        
        <div class="t-center">
            <h2 class="bold uppercase" style="font-size: 1.5em; margin: 2px 0; letter-spacing: 1px;">VAREJOSYNC</h2>
            <div>
                <p>Obrigado pela sua preferência!</p>
            </div>
        </div>

        <div class="linha-separadora"></div>

        <div class="t-center bold" style="font-size: 1.2em; margin: 6px 0;">
            RECIBO Nº 00009
        </div>

        <div class="flex-linha">
            <div style="width: 45%;">
                <div>DATA:</div>
                <div class="t-center bold">13/03/2026</div>
            </div>
            <div style="width: 55%;">
                <div style="padding-left: 5px;">CLIENTE:</div>
                <div class="t-center uppercase bold" style="padding-left: 5px;">AVULSO</div>
            </div>
        </div>

        <div class="flex-linha" style="margin-top: 4px;">
            <div style="width: 45%;">
                <div>HORA:</div>
                <div class="t-center bold">17:27</div>
            </div>
            <div style="width: 55%;">
                <div style="padding-left: 5px;">VEND.:</div>
                <div class="t-center uppercase bold" style="padding-left: 5px;">VENDEDOR</div>
            </div>
        </div>

        <div class="linha-separadora"></div>

        <table>
            <thead>
                <tr>
                    <th>DESC.</th>
                    <th>QTD</th>
                    <th>PREÇO</th>
                    <th>TOTAL</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="uppercase" style="padding-right: 2px;">PARAFUSO DRYWALL...</td>
                    <td>12</td>
                    <td>30,80</td>
                    <td class="bold">369,60</td>
                </tr>
            </tbody>
        </table>

        <div class="linha-separadora"></div>

        <div class="flex-linha">
            <div>Subtotal:</div>
            <div>369,60</div>
        </div>

        <div class="linha-separadora"></div>
        
        <div class="flex-linha bold" style="font-size: 1.3em; margin: 6px 0;">
            <div>TOTAL:</div>
            <div>R$ 369,60</div>
        </div>

        <div class="linha-separadora"></div>

        <div class="bold uppercase" style="margin: 6px 0 4px 0;">PAGAMENTO:</div>
        
        <div class="flex-linha">
            <div class="uppercase">DINHEIRO</div>
            <div class="bold">R$ 300,00</div>
        </div>
        <div class="flex-linha">
            <div class="uppercase">PIX</div>
            <div class="bold">R$ 69,60</div>
        </div>

        <div class="t-center" style="margin-top: 20px; font-size: 0.9em; color: #333;">
            <p>VAREJOSYNC ERP</p>
            <p>13/03/2026 17:27:00</p>
        </div>

    </div>

    <script>
        function imprimir(formato) {
            const recibo = document.getElementById('recibo');
            const estiloDinamico = document.getElementById('estilo-impressao-dinamico');

            if (formato === 'termica') {
                recibo.className = 'formato-termica';
                estiloDinamico.innerHTML = `
                    @media print {
                        @page { size: 80mm auto !important; margin: 0 !important; }
                    }
                `;
            } else if (formato === 'a4') {
                recibo.className = 'formato-a4';
                estiloDinamico.innerHTML = `
                    @media print {
                        @page { size: A4 portrait !important; margin: 15mm !important; }
                    }
                `;
            }

            setTimeout(() => {
                window.print();
            }, 100);
        }
    </script>
</body>
</html>
