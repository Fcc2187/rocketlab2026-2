const { chromium } = require('C:/Users/SAMSUNG/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  const errors = [];
  page.on('console', message => { logs.push({type: message.type(), text: message.text()}); });
  page.on('pageerror', error => errors.push(error.message));
  const image = 'http://127.0.0.1:5173/visual-fixture.png';
  const movie = { sk_movie_id: '0', titulo: 'Uma jornada cinematográfica através do tempo e da memória', ano_lancamento: 2024, url_poster: image, url_backdrop: image, generos: ['Drama', 'Ficção científica'], quantidade_avaliacoes: 24, media_avaliacoes: 8.4, sinopse: 'Uma história de escolhas, encontros e memórias que atravessam gerações.', diretores: ['Diretor'], atores: ['Ator'], roteiristas: ['Roteirista'], produtoras: ['Produtora'], duracao_minutos: 120, desempenho: null };
  await page.route('**/visual-fixture.png', route => route.fulfill({ path: 'artifacts/phase6/backdrop.png', contentType: 'image/png' }));
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/featured') || path.endsWith('/movies/0') ? movie : path.endsWith('/filters') ? {generos: movie.generos, anos:[2024]} : path.endsWith('/reviews') ? {items:[],total:0,page:1,page_size:4,total_pages:0} : { items:Array.from({length:10},(_,i)=>({...movie,sk_movie_id:String(i),titulo:i ? `Filme ${i}` : movie.titulo})),total:50,page:1,page_size:10,total_pages:5 };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  try {
    await page.goto('http://127.0.0.1:5173');
    await page.locator('.movie-card').first().waitFor();
    await page.evaluate(() => { document.title = 'Assessment B preflight'; const script = document.createElement('script'); script.id = 'assessment-b-preflight'; script.textContent = 'window.assessmentBMutable = true'; document.head.append(script); });
    const preflight = await page.evaluate(() => ({title:document.title,script:!!document.querySelector('#assessment-b-preflight'),executed:window.assessmentBMutable===true}));
    fs.writeFileSync('artifacts/phase10/assessment-b-preflight.json',JSON.stringify(preflight,null,2));
    if (!process.argv[2]) { console.log(JSON.stringify(preflight)); return; }
    const surfaces = [];
    for (const surface of ['home','details','login']) {
      await page.goto('http://127.0.0.1:5173');
      await page.locator('.movie-card').first().waitFor();
      if(surface==='details') { await page.getByRole('button',{name:'Ver detalhes',exact:true}).first().click(); await page.locator('.detail-facts').waitFor(); }
      if(surface==='login') { await page.getByRole('button',{name:'Entrar',exact:true}).first().click(); await page.locator('dialog').waitFor(); }
      await page.evaluate(() => { document.title='[Headless] Assessment B'; window.scrollTo(0,0); });
      const start=logs.length;
      await page.addScriptTag({url:process.argv[2]+'/detect.js'});
      await page.waitForTimeout(2800);
      const dom = await page.evaluate(() => ({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,overlays:[...document.querySelectorAll('[id],[class]')].filter(e=>/impeccable|detect-overlay/.test(e.id+' '+e.className)).map(e=>({tag:e.tagName,id:e.id,class:String(e.className),text:e.textContent})).slice(0,30)}));
      await page.screenshot({path:`artifacts/phase10/assessment-b-${surface}-overlay.png`,fullPage:true});
      surfaces.push({surface,logs:logs.slice(start),dom});
    }
    fs.writeFileSync('artifacts/phase10/assessment-b-browser.json',JSON.stringify({preflight,surfaces,errors},null,2));
    console.log(JSON.stringify({surfaces,errors},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});


