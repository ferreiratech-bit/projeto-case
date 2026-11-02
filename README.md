# CASE VIVER · CASE ILHA VERDE

Painel administrativo do **Complexo Ambiental Sustentável e Educacional**, com áreas para o Case Viver, Case Ilha Verde, Case Agro, Case Água e o ponto comercial Emporio.

## Iniciar no computador

O Node.js já instalado é suficiente — não é necessário baixar pacotes.

1. Abra um terminal na pasta `projeto-case`.
2. Execute `npm run start`.
3. Abra `http://127.0.0.1:4173` no navegador.
4. Os registros ficam centralizados em `case-data.json` e não dependem mais do navegador de origem.
5. Em outro computador da mesma rede, abra `http://IP-DO-SERVIDOR:4173` (descubra o IP com `ipconfig` no Windows). Libere a porta 4173 no firewall do computador servidor se ela for bloqueada.
6. Todos os computadores devem usar exatamente o mesmo endereço IP para evitar cópias locais divergentes.
7. Para parar o site, pressione `Ctrl+C` no terminal.

Também é possível iniciar com `node server.mjs`.

## O que o painel permite

- Criar, editar, acompanhar e excluir visitações com escola, data, horário, situação, participantes e equipe.
- Consultar quatro roteiros pedagógicos iniciais, organizados pelas modalidades e faixas etárias do projeto, e ajustar nome, duração, ordem e etapas de cada agenda.
- Consultar o PDF original da proposta pedagógica diretamente na capa ou abri-lo em uma nova aba. O arquivo está em `assets/proposta-pedagogica-case.pdf`.
- Planejar visitas individuais por roteiro ou visitas integradas em **dois grupos de até 20 alunos**, alternando entre Case Viver e Case Ilha Verde. O tamanho dos grupos é calculado automaticamente e cada agenda só é salva se as etapas somarem exatamente 240 minutos.
- Consultar as visitas em calendário, abrir rotas de carro no Google Maps e cadastrar a distância informada para cada escola.
- Lançar atividades de manutenção com local, espaço, prazo, situação e responsável.
- Abrir uma página própria para cada eixo e gerenciar equipamentos, cardápio, preços e equipe por unidade.
- Manter a lista de colaboradores vazia até que os nomes sejam cadastrados manualmente; adicionar, editar e excluir registros.
- Lançar manualmente alimentos e utensílios, quantidade por aluno e preço unitário; calcular quantidades e custos estimados para as visitas futuras relacionadas à unidade.
- Gerenciar uma biblioteca de escolas, espaços, equipamentos e veículos.
- Gerar relatórios por área e período, imprimir ou salvar como PDF e exportar tabelas em CSV.
- Exportar uma cópia dos dados em JSON e restaurá-la no navegador.

## Cuidados e limites desta primeira versão

- Os registros são salvos centralmente no arquivo `case-data.json` do servidor. O navegador mantém apenas uma cópia de segurança local. Não há autenticação ou controle de acesso por senha; mantenha o endereço somente na rede privada e não publique o servidor diretamente na internet.
- Google Maps abre o trajeto no serviço do Google. **Não** usa uma chave ou API paga e não calcula distâncias automaticamente; a distância pode ser consultada no mapa e registrada manualmente para orientar o planejamento.
- Os custos são estimativas que dependem do preenchimento de preços e quantidades reais. Os dados registrados não constituem lançamento financeiro contábil. O cardápio e os colaboradores começam sem nomes ou itens pré-carregados.
- Os roteiros têm agendas iniciais de 240 minutos. Os tempos por atividade (exceto a indicação aproximada de 40 minutos para a trilha longa) são sugestões editáveis e devem ser confirmados com a Diretoria. O roteiro integrado de dois grupos tem agenda própria nas configurações.
- O documento pedagógico informa quatro horas de visitação, enquanto os turnos nele descritos (`8h30–12h` e `13h30–17h`) abrangem três horas e meia. Confirme com a Diretoria o horário de funcionamento antes de publicar uma agenda definitiva.
- Antes do primeiro uso, configure os endereços das unidades e das escolas, confira os espaços e os equipamentos, valide a equipe e faça uma cópia de segurança dos dados.

Para uso centralizado por um administrador, com acesso em vários computadores, autenticação e dados compartilhados, será necessária uma etapa posterior de instalação de banco de dados, hospedagem privada e controle de acesso.

## Testes

Execute `npm test` para verificar as agendas pedagógicas e integradas de quatro horas, a divisão de grupos, o cálculo dos insumos, os links do Google Maps e a exportação CSV.
