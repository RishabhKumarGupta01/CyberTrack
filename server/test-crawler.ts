import { multiHopCrawler } from './services/multiHopCrawler.ts';

async function main() {
  console.log('=== Testing MultiHopCrawler ===');
  
  const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  console.log(`Starting crawl for address: ${testAddress}`);
  const rawTxs = await (multiHopCrawler as any).fetchOutgoingTransactions(testAddress, 'Ethereum');
  const outgoing = rawTxs.filter((t: any) => t.from.toLowerCase() === testAddress.toLowerCase());
  console.log(`Total txs: ${rawTxs.length}, Outgoing txs: ${outgoing.length}`);
  if (outgoing.length > 0) {
    console.log('Sample outgoing:', outgoing.slice(0, 5));
  } else {
    console.log('Sample incoming:', rawTxs.slice(0, 5));
  }

  const result = await multiHopCrawler.trace({
    startAddress: testAddress,
    blockchain: 'Ethereum',
    maxDepth: 3,
    minVolume: 0.05,
    maxBreadthPerNode: 5,
    stopOnExchange: true,
    delayMs: 50,
  });

  console.log('Result nodes:', result.nodes);
  console.log('Result edges:', result.edges);

  console.log(`Execution time: ${result.executionTimeMs}ms`);
  console.log(`Total nodes discovered: ${result.totalNodes}`);
  console.log(`Total edges discovered: ${result.totalEdges}`);
  console.log(`Max depth reached: ${result.maxDepthReached}`);
  console.log(`Total volume tracked: ${result.totalVolumeTracked} ${result.blockchain}`);
  console.log(`Identified endpoints:`, result.identifiedEndpoints);
  console.log(`Discovered paths:`, result.paths);
  console.log('\n--- Summary ---\n' + result.summary);

  if (result.totalNodes > 1 && result.maxDepthReached >= 2) {
    console.log('\n✓ Multi-hop crawl test PASSED successfully!');
  } else {
    console.error('\n✗ Multi-hop crawl did not reach expected depth.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Crawler test error:', err);
  process.exit(1);
});
