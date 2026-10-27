import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const snapshots=resolve(root,'screenshots');
const MIME={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async (req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const requested=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!requested.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  try{
    const data=await readFile(requested);
    res.writeHead(200,{'content-type':MIME[extname(requested)]||'application/octet-stream','cache-control':'no-store'});
    res.end(data);
  }catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,colorScheme:'light',reducedMotion:'reduce'});
  await context.addInitScript(()=>{
    class MockFile {
      constructor(name,body,mime){this.kind='file';this.name=name;this.body=body;this.mime=mime||'text/plain';}
      async getFile(){return new File([this.body],this.name,{type:this.mime});}
      async createWritable(){const handle=this;return {async write(blob){handle.body=blob;},async close(){},async abort(){}};}
      async queryPermission(){return 'granted';}
      async requestPermission(){return 'granted';}
    }
    class MockFolder {
      constructor(name){this.name=name;this.kind='directory';this.files=new Map();}
      async *entries(){for(const pair of this.files.entries())yield pair;}
      async getDirectoryHandle(name,opts={}){
        let item=this.files.get(name);
        if(!item&&opts.create){item=new MockFolder(name);this.files.set(name,item);}
        if(!item){throw new DOMException('Directory not found','NotFoundError');}
        if(item.kind!=='directory')throw new DOMException('Not a directory','TypeMismatchError');
        return item;
      }
      async getFileHandle(name,opts={}){
        let item=this.files.get(name);
        if(!item&&opts.create){item=new MockFile(name,'','application/json');this.files.set(name,item);}
        if(!item)throw new DOMException('File not found','NotFoundError');
        if(item.kind!=='file')throw new DOMException('Not a file','TypeMismatchError');
        return item;
      }
      async queryPermission(){return 'granted';}
      async requestPermission(){return 'granted';}
    }
    function art(i){
      const tones=[
        ['#e8e5de','#9fada8','#5a756c'],['#e8e8e5','#aca99f','#6d797b'],
        ['#dddacb','#a3aa9b','#4a635b'],['#e7e3df','#b3a89b','#77746d'],
        ['#dfe5df','#9fae9b','#586f62'],['#ebe8e2','#9dada8','#6d8684']
      ][i%6];
      let pieces='';
      for(let j=0;j<13;j++){
        const x=95+j*34;
        const y=70+((j+i*3)%7)*9;
        pieces+='<path d="M'+x+' '+y+' L'+(x+130)+' '+(y+110)+' L'+(x+130)+' '+(y+295)+' L'+x+' '+(y+185)+'Z" fill="none" stroke="'+tones[2]+'" stroke-width="2" opacity=".55"/>';
      }
      return '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">'+
        '<rect width="640" height="480" fill="'+tones[0]+'"/>'+
        '<path d="M0 370L240 280L640 350V480H0Z" fill="'+tones[1]+'" opacity=".37"/>'+
        '<path d="M80 125L325 50L560 155L560 377L315 427L80 310Z" fill="'+tones[1]+'"/>'+
        '<path d="M80 125L315 210L560 155M315 210V427" fill="none" stroke="'+tones[2]+'" stroke-width="4"/>'+
        pieces+'</svg>';
    }
    const source=new MockFolder('Architecture References');
    const titles=[
      'Kinetic Facade Study.svg','Folded Canopy.svg','Parametric Screen.svg',
      'Timber Lattice.svg','Gallery Envelope.svg','Geometric Atrium.svg',
      'Panel Morphology.svg','Spatial Grid.svg','Pavilion Study.svg',
      'Structural Ribs.svg','Facade Tessellation.svg','Courtyard Study.svg'
    ];
    titles.forEach((name,i)=>source.files.set(name,new MockFile(name,art(i),'image/svg+xml')));
    const papers=new MockFolder('Research Papers');
    papers.files.set('Solar daylight notes.md',new MockFile('Solar daylight notes.md','# Daylight research\n\nReference study.','text/markdown'));
    source.files.set(papers.name,papers);
    source.files.set('Methodology.md',new MockFile('Methodology.md','# Methodology\n\nInitial research methods.','text/markdown'));
    source.files.set('Performance results.json',new MockFile('Performance results.json','{"simulations":12}','application/json'));
    const parent=new MockFolder('Documents');
    let picks=0;
    Object.defineProperty(window,'showDirectoryPicker',{configurable:true,value:async()=>++picks===1?parent:source});
    window.__sourcebookFixture={parent,source,titles};
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'networkidle'});
  await page.locator('[data-action="create-catalog"]').waitFor();
  await mkdir(snapshots,{recursive:true});
  await page.screenshot({path:resolve(snapshots,'desktop-launcher.png')});

  await page.locator('[data-action="create-catalog"]').click();
  await page.locator('input[name="name"]').fill('Architecture Research');
  await page.locator('input[name="code"]').fill('ab');
  await page.locator('#catalog-form button.primary').click();
  await page.locator('[data-action="add-source"]').first().waitFor();
  await page.locator('[data-action="add-source"]').first().click();
  await page.locator('.resource[data-item]').first().waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.resource[data-item]').length>=12,{timeout:15000});
  await page.locator('.resource[data-item]').filter({hasText:'Kinetic Facade Study'}).click();
  await page.locator('#tag-input').fill('#Facades');
  await page.locator('#tag-input').press('Enter');
  await page.locator('#tag-input').fill('Generative / Geometry');
  await page.locator('#tag-input').press('Enter');
  if(await page.locator('.tag-pill').count()!==2)throw Error('Tag pills did not render');
  await page.locator('[data-remove-tag="0"]').click();
  await page.locator('#tag-input').fill('Facades');
  await page.locator('#tag-input').press('Enter');
  await page.locator('#notes').fill('Study of iterative geometric envelope systems.');
  await page.locator('[data-action="save-resource"]').click();
  await page.waitForFunction(()=>document.querySelector('.hint')?.textContent.includes('Catalog identity:'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.resource img.thumbnail')].filter(img=>img.complete&&img.naturalWidth>0).length>=8);
  // Wait out transient save/session warning to capture a stable, useful screen.
  await page.waitForTimeout(4700);
  if(errors.length)throw Error('Browser page errors: '+errors.join(' | '));
  const unchanged=await page.evaluate(()=>window.__sourcebookFixture.source.files.has('Kinetic Facade Study.svg'));
  if(!unchanged)throw Error('Sourcebook unexpectedly renamed a fixture file during metadata save');
  const record=await page.evaluate(async()=>{
    const dir=await window.__sourcebookFixture.parent.getDirectoryHandle('Architecture Research.sb');
    const records=await dir.getDirectoryHandle('resources');
    const file=await records.getFileHandle('ab1.json');
    return JSON.parse(await (await file.getFile()).text());
  });
  if(record.notes!=='Study of iterative geometric envelope systems.' || JSON.stringify(record.tags)!==JSON.stringify(['Generative / Geometry','Facades']))throw Error('Tag pill edits were not persisted as expected.');
  await page.screenshot({path:resolve(snapshots,'desktop-gallery.png')});
  console.log('Captured 1440×900: desktop-launcher.png and desktop-gallery.png');
  await context.close();
}finally{
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
}
