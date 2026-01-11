import net from 'net';

const PORT = 9101; // Mudamos para 9101 para evitar conflito com serviços de impressão do Windows (porta 9100 padrão)

const server = net.createServer((socket) => {
  console.log(`[VIRTUAL PRINTER] Cliente conectado: ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on('data', (data) => {
    console.log(`[VIRTUAL PRINTER] Recebido ${data.length} bytes de dados.`);
    
    // Tenta limpar os caracteres de controle para mostrar o texto legível
    // ESC/POS usa muitos comandos binários, então o texto ficará misturado com sujeira se não filtrarmos
    // Mas para teste, ver o texto "REI DO PIRÃO" ou os itens é suficiente.
    const text = data.toString('utf8').replace(/[\x00-\x1F\x7F-\x9F]/g, '.');
    
    console.log('\n--- TICKET RECEBIDO (Visualização Raw) ---');
    console.log(text);
    console.log('------------------------------------------\n');
  });

  socket.on('end', () => {
    console.log('[VIRTUAL PRINTER] Conexão encerrada.');
  });

  socket.on('error', (err) => {
    console.error(`[VIRTUAL PRINTER] Erro: ${err.message}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n=== IMPRESSORA VIRTUAL TÉRMICA INICIADA ===`);
  console.log(`Escutando na porta ${PORT}`);
  console.log(`Configure no sistema -> IP: 127.0.0.1 | Porta: ${PORT}`);
  console.log(`===========================================\n`);
});
