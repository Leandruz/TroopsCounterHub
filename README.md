# TroopsCounterHub ⚔️🛡️

Um script avançado e elegante para **Tribal Wars** de contagem de tropas, análise individual por aldeia e exportador de códigos BB para o fórum da tribo ou perfil do jogador.

## 📌 Funcionalidades

- **Painel Geral:** Estatísticas completas de tropas (próprias, em apoio e a caminho) e população militar ocupada.
- **Aba "Tropas por Aldeia":** Lista individualizada de cada aldeia com contagem exata de unidades, badges coloridas de categoria (Nuke, Defesa, Nobres, etc.), filtro por busca/coordenadas e botão de cópia individual ou em lote.
- **Gerador de Código BB Global:** Exportação de relatório com spoilers por categoria para fórum ou perfil.
- **Redirecionamento Inteligente:** Se clicado fora da página de tropas, redireciona automaticamente para `Visualizações -> Tropas`.

---

## 🚀 Como Usar no Tribal Wars

### 1. Criar o Bookmarklet (Favorito no Navegador)

Crie um favorito na barra de favoritos do seu navegador e insira o seguinte código na **URL**:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/Leandruz/TroopsCounterHub@main/troopsCounterBB.js?v='+Date.now();document.body.appendChild(s);})();
```

---

### 2. Executar no Jogo

1. Entre no **Tribal Wars**.
2. Clique no favorito do **TroopsCounterHub** no seu navegador.
3. Se estiver em qualquer outra página, o script redirecionará automaticamente para **Visualização Geral de Tropas** (`screen=overview_villages&mode=units`).
4. Ao abrir, a janela modal interativa será exibida instantaneamente!

---

## 🛠️ Tecnologias
- JavaScript (ES6+)
- jQuery (Ambiente Tribal Wars)
- Custom CSS / Modal Dark Mode com Design Moderno
