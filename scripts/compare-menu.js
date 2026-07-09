import fs from 'fs';
import fetch from 'node-fetch';

const old = JSON.parse(fs.readFileSync('backup/menu-snapshot.json','utf8'));

async function getNew(){
  const r = await fetch('http://localhost:3002/api/menu');
  return r.json();
}

function flatten(tree){
  return tree.reduce((acc,n)=>{
    if(n.path) acc.push({path:n.path});
    if(n.children) acc.push(...flatten(n.children));
    return acc;
  },[]);
}

(async()=>{
  const newTree = await getNew();
  const newSet = new Set(flatten(newTree).map(o=>o.path));
  const oldSet = new Set(old.map(o=>o.path));
  const missing = [...oldSet].filter(p=>!newSet.has(p));
  if(missing.length){
    console.error('❌ Rutas perdidas:',missing);
    process.exit(1);
  } else {
    console.log('✅ Todas las rutas actuales están en el nuevo menú');
  }
})();