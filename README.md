# Portal de Ferramentas do Atendimento

Aplicação estática em HTML, CSS e JavaScript para publicação no GitHub Pages.

## Funcionalidades atuais

- Conversão de imagem para JPG, PNG e WEBP
- Compressão de imagem em WEBP
- Geração de PDF a partir de várias imagens
- Gravação de áudio pelo microfone
- Assistente simples por palavras-chave
- Layout responsivo
- Processamento local no navegador

## Estrutura

```text
portal-ferramentas-atendimento/
├── index.html
├── css/style.css
├── js/
├── pages/
└── CONTEXTO_CODEX.md
```

## Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos deste projeto para a raiz do repositório.
3. Abra Settings > Pages.
4. Em Source, selecione Deploy from a branch.
5. Escolha a branch main e a pasta /root.
6. Salve e aguarde a publicação.

## Observações

- O microfone exige HTTPS. O GitHub Pages já fornece HTTPS.
- O áudio é salvo em WEBM ou OGG, dependendo do navegador.
- A página de PDF usa jsPDF por CDN.
- Os módulos JavaScript funcionam normalmente no GitHub Pages.
- Ao abrir os arquivos diretamente com file://, alguns navegadores podem bloquear módulos ou microfone.

## Próximas funcionalidades sugeridas

- Conversão de áudio para MP3 com ffmpeg.wasm
- Conversão e compressão de vídeos pequenos
- Reordenação das imagens por arrastar e soltar
- Redimensionador e recortador de imagens
- Ferramentas adicionais para PDF
- PWA para instalação no computador
