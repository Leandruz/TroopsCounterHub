# TroopsCounterHub ⚔️🛡️

Contador de Tropas avançado para **Tribal Wars** com visualização por aldeia e exportação de código BB.

Baseado no script original **Licznik wojska** (To6iasz / natanprog), expandido com funcionalidades extras.

## 📌 Funcionalidades

- **Contador de Tropas Global:** Resumo total de tropas por tipo (Disponível, Próprias, Na Aldeia, Apoios, Fora, Em Trânsito).
- **Seleção por Grupo:** Filtra o resumo geral por qualquer grupo de aldeias configurado no jogo.
- **Tropas por Aldeia:** Mostra tropas individualizadas de cada aldeia, respeitando o filtro de tipo selecionado.
- **Mapeamento de Grupos:** Identifica automaticamente os grupos de cada aldeia na visão detalhada.
- **Filtro de Grupos na Tabela:** Permite filtrar a tabela de aldeias por um grupo específico.
- **Exportação BB Code:** Gera código BB do resumo global e também por aldeia individual para colar no fórum ou perfil.
- **Interface Nativa do Jogo:** Usa o popup nativo do Tribal Wars (`Dialog.show`), compatível com todos os mundos.

---

## 🚀 Como Usar

### 1. Criar o Bookmarklet

Crie um favorito no navegador com o seguinte código no campo **URL**:

```
javascript:$.getScript('https://cdn.jsdelivr.net/gh/Leandruz/TroopsCounterHub@9524e0e/troopsCounterBB.js');void 0;
```

> ⚠️ Se o navegador remover o `javascript:` do início ao colar, digite `javascript:` manualmente antes do restante.

### 2. Executar no Jogo

1. Entre no **Tribal Wars** em qualquer tela.
2. Clique no favorito **TroopsCounter**.
3. O popup nativo do jogo será exibido com o contador de tropas!
4. Para ver a nova funcionalidade, clique em **"Tropas por Aldeia"**.

---

## 🛠️ Tecnologias
- JavaScript (ES5 compatível)
- jQuery + Dialog.show (APIs nativas do Tribal Wars)
- XMLHttpRequest assíncrono para buscar dados e mapear grupos dinamicamente
