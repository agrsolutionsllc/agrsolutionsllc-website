const path=require('path');
const fs=require('fs');
const express=require('express');
const {Pool}=require('pg');
require('dotenv').config({path:path.join(__dirname,'.env')});

const HOST='127.0.0.1';
const PORT=Number(process.env.PORT||8787);
const pool=new Pool({
  host:process.env.PGHOST||'127.0.0.1',
  port:Number(process.env.PGPORT||5432),
  database:process.env.PGDATABASE||'agr_crm',
  user:process.env.PGUSER||'agr_crm',
  password:process.env.PGPASSWORD||'',
  max:5
});

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'25mb'}));

async function initializeDatabase(){
  const schema=fs.readFileSync(path.join(__dirname,'db','schema.sql'),'utf8');
  await pool.query(schema);
}

app.get('/api/health',async(req,res)=>{
  try{
    const result=await pool.query('SELECT NOW() AS now');
    res.json({ok:true,service:'AGR CRM Local Server',database:true,time:result.rows[0].now});
  }catch(err){
    res.status(500).json({ok:false,error:'Database unavailable'});
  }
});

app.get('/api/state',async(req,res)=>{
  try{
    const result=await pool.query('SELECT data, updated_at FROM crm_state WHERE id=1');
    const row=result.rows[0]||{data:{},updated_at:null};
    res.set('Cache-Control','no-store');
    res.json({ok:true,data:row.data||{},updatedAt:row.updated_at});
  }catch(err){
    console.error(err);
    res.status(500).json({ok:false,error:'Could not read CRM data'});
  }
});

app.put('/api/state',async(req,res)=>{
  const state=req.body?.data;
  if(!state || typeof state!=='object' || Array.isArray(state)){
    return res.status(400).json({ok:false,error:'Invalid CRM data'});
  }
  try{
    const result=await pool.query(
      `INSERT INTO crm_state (id,data,updated_at)
       VALUES (1,$1::jsonb,NOW())
       ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
       RETURNING updated_at`,
      [JSON.stringify(state)]
    );
    res.json({ok:true,updatedAt:result.rows[0].updated_at});
  }catch(err){
    console.error(err);
    res.status(500).json({ok:false,error:'Could not save CRM data'});
  }
});

app.post('/api/import',async(req,res)=>{
  const state=req.body?.data;
  if(!state || typeof state!=='object' || Array.isArray(state)){
    return res.status(400).json({ok:false,error:'Invalid backup data'});
  }
  try{
    const result=await pool.query(
      `UPDATE crm_state SET data=$1::jsonb, updated_at=NOW() WHERE id=1 RETURNING updated_at`,
      [JSON.stringify(state)]
    );
    res.json({ok:true,updatedAt:result.rows[0].updated_at});
  }catch(err){
    console.error(err);
    res.status(500).json({ok:false,error:'Could not import CRM data'});
  }
});

app.get('/api/export',async(req,res)=>{
  try{
    const result=await pool.query('SELECT data, updated_at FROM crm_state WHERE id=1');
    const row=result.rows[0]||{data:{},updated_at:null};
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="AGR-CRM-backup-${stamp}.json"`);
    res.send(JSON.stringify({exportedAt:new Date().toISOString(),updatedAt:row.updated_at,data:row.data||{}},null,2));
  }catch(err){
    console.error(err);
    res.status(500).json({ok:false,error:'Could not export CRM data'});
  }
});

const crmPath=path.resolve(__dirname,'..','crm-v18');
app.use('/',express.static(crmPath,{etag:false,lastModified:false,setHeaders(res){res.setHeader('Cache-Control','no-store');}}));

initializeDatabase().then(()=>{
  app.listen(PORT,HOST,()=>{
    console.log(`AGR CRM Local Server: http://${HOST}:${PORT}`);
  });
}).catch(err=>{
  console.error('AGR CRM server could not start:',err);
  process.exit(1);
});

process.on('SIGINT',async()=>{await pool.end();process.exit(0);});
process.on('SIGTERM',async()=>{await pool.end();process.exit(0);});
