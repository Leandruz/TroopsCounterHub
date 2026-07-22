# TroopsCounterHub ⚔️🛡️

Um script avançado e elegante para **Tribal Wars** de contagem de tropas e exportador de códigos BB para relatórios e planejamentos.

## 📌 Funcionalidades

- **Contagem Completa de Tropas:** Analisa tropas próprias, na aldeia, em apoio e em viagem.
- **Cálculo de População (Fazenda):** Exibe a quantidade exata de população ocupada por tipo de unidade e por grupo de aldeias.
- **Filtros e Visualização Interativa:** Interface dinâmica com tema escuro (Dark Mode), tipografia moderna e métricas detalhadas.
- **Gerador de Código BB:** Exportação simplificada para postagens no fórum da tribo ou mensagens privadas.

## 🚀 Como Usar no Tribal Wars

### 1. Criar o Bookmarklet (Favorito no Navegador)

Crie um novo favorito na barra de favoritos do seu navegador e insira o seguinte código no campo **URL**:

#### **Opção Recomendada (Injeção Dinâmica com Cache-Buster):**
```javascript
javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/Leandruz/TroopsCounterHub@main/troopsCounterBB.js?v='+Date.now();document.body.appendChild(s);})();
```

#### **Opção Alternativa (via $.getScript):**
```javascript
javascript:$.getScript('https://cdn.jsdelivr.net/gh/Leandruz/TroopsCounterHub@main/troopsCounterBB.js?v='+Date.now());
```

---

### 2. Executar no Jogo

1. Entre no **Tribal Wars**.
2. Acesse a tela de **Visualização Geral de Tropas** (`Visualizações -> Tropas` ou URL com `screen=overview_villages&mode=units`).
3. Clique no favorito (bookmarklet) salvo no seu navegador.
4. O painel do **TroopsCounterHub** será exibido instantaneamente!

---

## 🛠️ Tecnologias
- JavaScript (ES6+)
- jQuery (Ambiente Tribal Wars)
- Custom CSS / Modal com Design Moderno
