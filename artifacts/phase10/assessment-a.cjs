const {chromium}=require('C:/Users/SAMSUNG/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const image='http://127.0.0.1:5173/a-fixture.png';
 const titles=['Uma jornada cinematográfica através do tempo e da memória','Filme sem imagem','Oppenheimer','Ainda Estou Aqui','Duna: Parte Dois','O Fabuloso Destino de Amélie Poulain','Parasita','Central do Brasil','A Viagem de Chihiro','Cinema Paradiso'];
 const films=titles.map((titulo,i)=>({sk_movie_id:String(i),titulo,ano_lancamento:2024,url_poster:i===1?null:image,generos:['Drama','Ficção científica'],quantidade_avaliacoes:i===1?0:24,media_avaliacoes:i===1?null:8.4}));
 const featured={...films[0],url_backdrop:image,sinopse:'Uma história de escolhas, encontros e memórias que atravessam gerações.',diretores:['Diretor de exemplo'],atores:['Ator de exemplo'],roteiristas:[],produtoras:[],duracao_minutos:140,status_filme:'Lançado',desempenho:null};
 let state='normal';
 await page.route('**/a-fixture.png',r=>r.fulfill({path:'artifacts/phase6/backdrop.png',contentType:'image/png'}));
 await page.route('**/api/v1/**',async r=>{
 const u=new URL(r.request().url());let body;
 if(u.pathname.endsWith('/auth/login'))body={access_token:'mock-token'};
 else if(u.pathname.endsWith('/featured'))body=featured;
 else if(u.pathname.endsWith('/filters'))body={generos:['Drama','Ficção científica'],anos:[2024]};
 else if(u.pathname.includes('/reviews'))body={items:[],total:0,page:1,page_size:10,total_pages:0};
 else if(/\/movies\/\d+$/.test(u.pathname))body=featured;
 else body={items:state==='empty'?[]:films,total:state==='empty'?0:50,page:1,page_size:10,total_pages:state==='empty'?0:5};
 await r.fulfill({status:state==='error'&&u.pathname.endsWith('/movies')?503:200,contentType:'application/json',body:JSON.stringify(state==='error'&&u.pathname.endsWith('/movies')?{detail:'Catálogo indisponível'}:body)});
 });
 await page.goto('http://127.0.0.1:5173');await page.locator('.movie-card').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:'artifacts/phase10/a-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Ver detalhes',exact:true}).click();await page.locator('.detail-overview').waitFor();await page.screenshot({path:'artifacts/phase10/a-details.png'});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('[name=username]').fill('admin');await page.locator('[name=password]').fill('password');await page.locator('dialog').getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:'+ Adicionar filme',exact:true}).click();await page.screenshot({path:'artifacts/phase10/a-admin.png'});await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5173');await page.locator('.movie-card').first().waitFor();await page.screenshot({path:'artifacts/phase10/a-mobile.png',fullPage:true});
 console.log(JSON.stringify(await page.evaluate(()=>({hero:document.querySelector('.hero').getBoundingClientRect().toJSON(),catalog:document.querySelector('.catalog').getBoundingClientRect().toJSON(),firstCard:document.querySelector('.movie-card').getBoundingClientRect().toJSON(),viewport:innerHeight}))));
 await page.getByRole('button',{name:'Avaliar',exact:true}).first().click();await page.locator('textarea').fill('Rascunho de avaliação');await page.screenshot({path:'artifacts/phase10/a-review-mobile.png'});await page.keyboard.press('Escape');console.log('Draft closed by Escape; review dialog count:',await page.locator('dialog').count());
 for(state of ['empty','error']){await page.goto('http://127.0.0.1:5173');await page.locator('.catalog-state').waitFor();await page.screenshot({path:`artifacts/phase10/a-${state}.png`,fullPage:true});}
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
