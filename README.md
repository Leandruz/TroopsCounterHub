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

1. Clique com o **botão direito** na barra de favoritos do seu navegador.
2. Selecione **"Adicionar página..."** (ou "Adicionar Favorito").
3. No campo **Nome**, coloque: `TroopsCounter`
4. No campo **URL**, cole **exatamente** o código abaixo:

```
javascript:void($.getScript('https://cdn.jsdelivr.net/gh/Leandruz/TroopsCounterHub@main/troopsCounterBB.js'))
```

> ⚠️ **IMPORTANTE:** O navegador pode remover automaticamente o `javascript:` do início quando você cola. Se isso acontecer, **digite `javascript:` manualmente** antes do restante do código.

---

### 2. Executar no Jogo

1. Entre no **Tribal Wars**.
2. Clique no favorito **TroopsCounter** no seu navegador.
3. Se estiver em qualquer outra página, o script redirecionará automaticamente para a tela de Tropas.
4. Ao abrir na tela de Tropas, a janela modal interativa será exibida!

---

## 🛠️ Tecnologias
- JavaScript (ES6+)
- jQuery 3.5.1 (já incluído no Tribal Wars)
- Custom CSS / Modal Dark Mode com Design Moderno
