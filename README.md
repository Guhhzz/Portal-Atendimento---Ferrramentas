# Portal de Ferramentas do Atendimento

Aplicacao estatica em HTML, CSS e JavaScript para publicacao no GitHub Pages.

## Funcionalidades atuais

- Conversao de imagem para JPG, PNG e WEBP
- Compressao de imagem em WEBP
- Geracao de PDF a partir de varias imagens
- Gravacao de audio pelo microfone com exportacao em MP3
- Gravacao de tela com microfone e som do sistema quando suportado
- Geracao de pacote ZIP de arquivos
- Recorte visual de audio em WAV
- Uniao de multiplos audios em WAV
- Ajuste de audio com normalizacao e corte de silencio
- Respostas rapidas para atendimento
- Layout responsivo
- Processamento local no navegador

## Estrutura

```text
portal-ferramentas-atendimento/
|-- index.html
|-- css/style.css
|-- js/
|-- pages/
|-- CONTEXTO_CODEX.md
```

## Publicacao no GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie todos os arquivos deste projeto para a raiz do repositorio.
3. Abra Settings > Pages.
4. Em Source, selecione Deploy from a branch.
5. Escolha a branch main e a pasta /root.
6. Salve e aguarde a publicacao.

## Observacoes

- O microfone e a gravacao de tela exigem HTTPS. O GitHub Pages ja fornece HTTPS.
- O gravador de audio usa conversor MP3 local no navegador; se o navegador bloquear a conversao, usa OGG ou WEBM como alternativa.
- A gravacao de tela normalmente e salva em WEBM no Chrome/Edge.
- As ferramentas de audio geram WAV para preservar compatibilidade sem backend.
- A pagina de PDF gera o arquivo sem depender de CDN.
- Os scripts tambem foram ajustados para funcionar ao abrir as paginas por arquivo local.

## Proximas funcionalidades sugeridas

- Separar paginas de PDF
- Reordenacao das imagens por arrastar e soltar
- Redimensionador e recortador de imagens
- Ferramentas adicionais para PDF
- Transcricao de audio via backend dedicado
- Edicao de video via backend dedicado
- PWA para instalacao no computador
