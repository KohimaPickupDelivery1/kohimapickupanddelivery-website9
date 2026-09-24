const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const WA = process.env.KPD_WHATSAPP || '918416005303';
const ADMIN_PASSWORD = process.env.KPD_ADMIN_PASSWORD || 'change-this-password';
const DATA = path.join(__dirname, 'data');
const ordersFile = path.join(DATA, 'orders.json');
const usersFile = path.join(DATA, 'users.json');
fs.mkdirSync(DATA, {recursive:true});
for (const f of [ordersFile, usersFile]) if (!fs.existsSync(f)) fs.writeFileSync(f,'[]');
const sessions = new Map();
function read(file){ try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return [];} }
function write(file,data){ fs.writeFileSync(file, JSON.stringify(data,null,2)); }
function id(){return 'KPD-'+new Date().getFullYear()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();}
function hash(p){return crypto.createHash('sha256').update(p).digest('hex');}
function waLink(text){return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;}
function auth(req,res,next){const sid=req.headers.cookie?.match(/kpd_session=([^;]+)/)?.[1]; const s=sessions.get(sid); if(!s)return res.status(401).json({error:'Login required'}); req.user=s; next();}
function admin(req,res,next){if(req.headers['x-admin-key']!==ADMIN_PASSWORD)return res.status(401).json({error:'Admin access denied'}); next();}
app.use(express.json({limit:'100kb'}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

app.get('/api/config',(req,res)=>res.json({whatsapp:WA, phone:'+91'+WA.replace(/^91/,''), city:'Kohima'}));
app.post('/api/orders',(req,res)=>{
  const b=req.body||{};
  const required=['name','phone','pickup','drop','packageType'];
  if(required.some(k=>!String(b[k]||'').trim())) return res.status(400).json({error:'Please complete all required fields.'});
  const order={id:id(),createdAt:new Date().toISOString(),status:'Quote requested',statusHistory:[{status:'Quote requested',at:new Date().toISOString()}],quote:null,customer:{name:String(b.name).trim(),phone:String(b.phone).trim()},pickup:String(b.pickup).trim(),drop:String(b.drop).trim(),packageType:String(b.packageType).trim(),pickupTime:String(b.pickupTime||'').trim(),instructions:String(b.instructions||'').trim(),paymentStatus:'Pending',driver:null};
  const orders=read(ordersFile); orders.unshift(order); write(ordersFile,orders);
  const msg=`*KPD DELIVERY — NEW ORDER*\n\nOrder ID: ${order.id}\nName: ${order.customer.name}\nPhone: ${order.customer.phone}\nPickup: ${order.pickup}\nDelivery: ${order.drop}\nPackage: ${order.packageType}\nPreferred time: ${order.pickupTime||'Not specified'}\nInstructions: ${order.instructions||'None'}\n\nPlease confirm the delivery charge and timing.`;
  res.json({orderId:order.id,whatsapp:waLink(msg),order});
});
app.get('/api/orders/:id',(req,res)=>{const o=read(ordersFile).find(x=>x.id.toLowerCase()===req.params.id.toLowerCase()); if(!o)return res.status(404).json({error:'Order not found'}); res.json({id:o.id,createdAt:o.createdAt,status:o.status,statusHistory:o.statusHistory,quote:o.quote,pickup:o.pickup,drop:o.drop,packageType:o.packageType,paymentStatus:o.paymentStatus,driver:o.driver?{name:o.driver.name,phone:o.driver.phone}:null});});
app.post('/api/register',(req,res)=>{const {name,phone,password}=req.body||{}; if(!name||!phone||!password||String(password).length<6)return res.status(400).json({error:'Name, phone and a 6+ character password are required.'}); const users=read(usersFile); if(users.some(u=>u.phone===phone))return res.status(409).json({error:'An account with this phone already exists.'}); const user={id:crypto.randomBytes(5).toString('hex'),name,phone,password:hash(password),createdAt:new Date().toISOString()}; users.push(user);write(usersFile,users);const sid=crypto.randomBytes(24).toString('hex');sessions.set(sid,user);res.setHeader('Set-Cookie',`kpd_session=${sid}; HttpOnly; Path=/; SameSite=Lax`);res.json({name:user.name,phone:user.phone});});
app.post('/api/login',(req,res)=>{const {phone,password}=req.body||{};const u=read(usersFile).find(x=>x.phone===phone&&x.password===hash(password||''));if(!u)return res.status(401).json({error:'Invalid phone or password.'});const sid=crypto.randomBytes(24).toString('hex');sessions.set(sid,u);res.setHeader('Set-Cookie',`kpd_session=${sid}; HttpOnly; Path=/; SameSite=Lax`);res.json({name:u.name,phone:u.phone});});
app.get('/api/me',auth,(req,res)=>res.json({name:req.user.name,phone:req.user.phone}));
app.get('/api/my-orders',auth,(req,res)=>{const os=read(ordersFile).filter(o=>o.customer.phone===req.user.phone).map(o=>({id:o.id,createdAt:o.createdAt,status:o.status,quote:o.quote,pickup:o.pickup,drop:o.drop,packageType:o.packageType,paymentStatus:o.paymentStatus}));res.json(os);});
app.post('/api/admin/login',(req,res)=>{if(req.body?.password!==ADMIN_PASSWORD)return res.status(401).json({error:'Wrong admin password'});const key=crypto.randomBytes(24).toString('hex');sessions.set('admin:'+key,{admin:true});res.json({key});});
app.get('/api/admin/orders',admin,(req,res)=>res.json(read(ordersFile)));
app.patch('/api/admin/orders/:id',admin,(req,res)=>{const orders=read(ordersFile);const o=orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({error:'Order not found'});const b=req.body||{}; if(b.status&&b.status!==o.status){o.status=b.status;o.statusHistory.push({status:b.status,at:new Date().toISOString()});} if(b.quote!==undefined)o.quote=b.quote===''?null:Number(b.quote);if(b.paymentStatus)o.paymentStatus=b.paymentStatus;if(b.driver)o.driver=b.driver;write(ordersFile,orders);res.json(o);});
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.listen(PORT,()=>console.log(`KPD Delivery V2 running on http://localhost:${PORT}`));
