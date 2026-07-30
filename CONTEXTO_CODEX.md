# CONTEXTO DO PROJETO PARA O CODEX

## Nome do projeto
Portal de Ferramentas do Atendimento

## Empresa e area
Projeto interno pensado para a equipe de Atendimento ao Cliente da Gazin.

## Objetivo
Centralizar ferramentas simples de conversao, compressao, gravacao e preparacao de arquivos, reduzindo a necessidade de acessar sites externos. A aplicacao deve funcionar de maneira estatica no GitHub Pages e processar os arquivos localmente no navegador sempre que possivel.

## Stack obrigatoria da versao atual
- HTML5
- CSS3
- JavaScript puro
- Sem Node.js no ambiente de producao
- Sem backend
- Sem banco de dados
- Compativel com GitHub Pages

## Decisoes ja tomadas
1. Nao utilizar Next.js, React ou qualquer framework que exija build nesta primeira versao.
2. O gravador de audio deve converter a gravacao para MP3 no navegador para melhorar o envio pelo WhatsApp.
3. O gravador de audio deve baixar OGG ou WEBM apenas se o conversor MP3 nao estiver disponivel.
4. O gravador de tela deve usar MediaRecorder e baixar MP4 apenas quando o navegador oferecer suporte real; caso contrario, usar WEBM.
5. Os arquivos devem ser processados no navegador e nao enviados para servidor.
6. O visual deve ser profissional, tecnologico, responsivo e inspirado em tons de azul utilizados pela Gazin.
7. O projeto deve ser simples para colaboradores com pouca familiaridade tecnica.

## Funcionalidades implementadas
- Pagina inicial com menu lateral, cards de ferramentas e assistente por palavras-chave.
- Conversor de imagens para JPG, PNG e WEBP.
- Compressor de imagens com controle de qualidade e largura maxima.
- Imagens para PDF usando jsPDF via CDN.
- Gravador de audio com iniciar, pausar, continuar, finalizar, ouvir, excluir e baixar.
- Gravador de tela com captura de tela, microfone, som do sistema quando suportado, previa, exclusao e download.
- Layout responsivo para desktop e celular.

## Estrutura atual
- index.html: pagina inicial.
- css/style.css: visual compartilhado.
- js/app.js: menu movel, assistente e atalhos.
- js/file-utils.js: funcoes reutilizaveis.
- js/image-converter.js: conversao de imagens.
- js/image-compressor.js: compressao de imagens.
- js/images-to-pdf.js: geracao de PDF.
- js/audio-recorder.js: gravacao pelo microfone.
- js/screen-recorder.js: gravacao de tela.
- pages/: paginas das ferramentas.

## Regras de desenvolvimento
- Manter compatibilidade com GitHub Pages.
- Nao adicionar dependencias que exijam backend.
- Preferir APIs nativas do navegador.
- Validar tipos de arquivo antes do processamento.
- Exibir mensagens de erro claras e em portugues.
- Nao armazenar dados ou arquivos do usuario.
- Evitar bibliotecas muito pesadas sem necessidade.
- Manter acessibilidade basica: labels, aria-label, contraste e navegacao clara.
- Preservar a identidade visual atual, salvo solicitacao expressa de redesign.

## Limitacoes conhecidas
- MP3 depende do carregamento do encoder client-side; sem esse recurso, o site usa OGG/WEBM.
- MP4 no gravador de tela depende do suporte real do navegador.
- O som do sistema depende do navegador e da opcao de compartilhamento escolhida pelo usuario.
- O acesso ao microfone e a gravacao de tela requerem HTTPS ou localhost.
- A geracao de PDF depende da CDN do jsPDF.

## Proximos passos recomendados
1. Testar todas as ferramentas no GitHub Pages.
2. Testar gravacao de tela em Chrome e Edge com aba, janela e tela inteira.
3. Melhorar a reordenacao das imagens do PDF com arrastar e soltar.
4. Criar redimensionador de imagens.
5. Criar recortador de imagens.
6. Avaliar PWA para permitir instalacao do portal.
7. Adicionar identidade visual oficial apos receber logos e guia de marca autorizados.

## Criterios de aceite
- O portal deve abrir sem erros no GitHub Pages.
- Nenhuma ferramenta deve depender de localhost.
- A gravacao deve pedir permissao do microfone/tela quando necessario.
- A conversao de imagem deve baixar o formato selecionado.
- A compressao deve gerar um arquivo menor na maioria dos casos e avisar quando isso nao ocorrer.
- O PDF deve respeitar a ordem das imagens listadas.
- O gravador de tela deve gerar um arquivo reproduzivel no formato suportado pelo navegador.
- O layout deve funcionar em desktop e celular.
