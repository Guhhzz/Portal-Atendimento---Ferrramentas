# CONTEXTO DO PROJETO PARA O CODEX

## Nome do projeto
Portal de Ferramentas do Atendimento

## Empresa e área
Projeto interno pensado para a equipe de Atendimento ao Cliente da Gazin.

## Objetivo
Centralizar ferramentas simples de conversão, compressão e preparação de arquivos, reduzindo a necessidade de acessar sites externos. A aplicação deve funcionar de maneira estática no GitHub Pages e processar os arquivos localmente no navegador sempre que possível.

## Stack obrigatória da versão atual
- HTML5
- CSS3
- JavaScript puro
- Sem Node.js no ambiente de produção
- Sem backend
- Sem banco de dados
- Compatível com GitHub Pages

## Decisões já tomadas
1. Não utilizar Next.js, React ou qualquer framework que exija build nesta primeira versão.
2. Não implementar MP3 agora.
3. O gravador deve baixar WEBM ou OGG conforme suporte do navegador.
4. Os arquivos devem ser processados no navegador e não enviados para servidor.
5. O visual deve ser profissional, tecnológico, responsivo e inspirado em tons de azul utilizados pela Gazin.
6. O projeto deve ser simples para colaboradores com pouca familiaridade técnica.

## Funcionalidades implementadas
- Página inicial com menu lateral e cards de ferramentas.
- Assistente por palavras-chave.
- Conversor de imagens para JPG, PNG e WEBP.
- Compressor de imagens com controle de qualidade e largura máxima.
- Imagens para PDF usando jsPDF via CDN.
- Gravador de áudio com iniciar, pausar, continuar, finalizar, ouvir, excluir e baixar.
- Layout responsivo para desktop e celular.

## Estrutura atual
- index.html: página inicial.
- css/style.css: todo o visual compartilhado.
- js/app.js: menu móvel e assistente.
- js/file-utils.js: funções reutilizáveis.
- js/image-converter.js: conversão de imagens.
- js/image-compressor.js: compressão de imagens.
- js/images-to-pdf.js: geração de PDF.
- js/audio-recorder.js: gravação pelo microfone.
- pages/: páginas das ferramentas.

## Regras de desenvolvimento
- Manter compatibilidade com GitHub Pages.
- Não adicionar dependências que exijam backend.
- Preferir APIs nativas do navegador.
- Validar tipos de arquivo antes do processamento.
- Exibir mensagens de erro claras e em português.
- Não armazenar dados ou arquivos do usuário.
- Evitar bibliotecas muito pesadas sem necessidade.
- Manter acessibilidade básica: labels, aria-label, contraste e navegação clara.
- Preservar a identidade visual atual, salvo solicitação expressa de redesign.

## Limitações conhecidas
- MP3 ainda não implementado.
- Conversão de vídeo ainda não implementada devido ao peso do ffmpeg.wasm.
- O acesso ao microfone requer HTTPS ou localhost.
- O uso de módulos ES pode falhar quando os arquivos são abertos diretamente por file://; no GitHub Pages funciona normalmente.
- A geração de PDF depende da CDN do jsPDF.

## Próximos passos recomendados
1. Testar todas as ferramentas no GitHub Pages.
2. Adicionar ordenação das imagens do PDF por arrastar e soltar.
3. Criar redimensionador de imagens.
4. Criar recortador de imagens.
5. Criar conversor de vídeo apenas para arquivos pequenos com ffmpeg.wasm.
6. Avaliar PWA para permitir instalação do portal.
7. Adicionar identidade visual oficial após receber logos e guia de marca autorizados.

## Critérios de aceite
- O portal deve abrir sem erros no GitHub Pages.
- Nenhuma ferramenta deve depender de localhost.
- A gravação deve pedir permissão do microfone e produzir um arquivo reproduzível.
- A conversão de imagem deve baixar o formato selecionado.
- A compressão deve gerar um arquivo menor na maioria dos casos.
- O PDF deve respeitar a ordem das imagens listadas.
- O layout deve funcionar em desktop e celular.
