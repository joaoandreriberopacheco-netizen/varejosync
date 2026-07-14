// Avalia fórmulas simples e retorna apenas o resultado numérico
export function avaliarFormula(valor) {
  if (typeof valor !== 'string' || !valor.trim()) return valor;
  
  const trimmed = valor.trim();
  
  // Verifica se é uma fórmula (começa com =)
  if (!trimmed.startsWith('=')) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? trimmed : num;
  }

  try {
    const expressao = trimmed.substring(1); // Remove o =
    
    // Valida caracteres permitidos: números, operadores básicos, parênteses, ponto e espaço
    if (!/^[\d\s+\-*/.()]+$/.test(expressao)) {
      return null; // Fórmula inválida
    }

    // Usa Function para avaliar (seguro pois já validamos os caracteres)
    const resultado = Function('"use strict"; return (' + expressao + ')')();
    
    if (typeof resultado !== 'number' || isNaN(resultado)) {
      return null;
    }

    return Math.round(resultado * 100) / 100; // Arredonda para 2 casas decimais
  } catch {
    return null; // Erro na avaliação
  }
}