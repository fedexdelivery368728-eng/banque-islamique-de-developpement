const express=require('express');
const session=require('express-session');
const Database=require('better-sqlite3');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const app=express();
const dataDir=process.env.DATA_DIR || path.join(__dirname,'data');
fs.mkdirSync(dataDir,{recursive:true});
const dbPath=process.env.DB_PATH || path.join(dataDir,'Banque Islamique de Développement.sqlite');
const db=new Database(dbPath);
db.pragma('journal_mode=WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,balance_cents INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS transactions(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,
 kind TEXT NOT NULL,label TEXT NOT NULL,amount_cents INTEGER NOT NULL,
 balance_after_cents INTEGER NOT NULL,created_at TEXT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id));

CREATE TABLE IF NOT EXISTS beneficiaries(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,
 name TEXT NOT NULL,account_no TEXT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS incoming_transfers(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 sender_name TEXT NOT NULL,
 reference TEXT NOT NULL DEFAULT '',
 amount_cents INTEGER NOT NULL,
 condition_type TEXT NOT NULL DEFAULT 'manual',
 condition_text TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL,
 validated_at TEXT,
 FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS admins(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
`);
try{
  db.prepare("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1").run();
}catch(e){}
function addUserColumn(sql){
 try{
  db.prepare(sql).run();
 }catch(e){}
}
addUserColumn("ALTER TABLE users ADD COLUMN first_name TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN last_name TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN birth_date TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN birth_place TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN nationality TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN gender TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN marital_status TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN phone TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN address TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN city TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN country TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN id_type TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN id_number TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN id_issue_date TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN id_expiry_date TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN id_country TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN profession TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN employer TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN business_sector TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN monthly_income TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN income_source TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN account_type TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN account_currency TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN first_name TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN last_name TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN birth_date TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN birth_place TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN nationality TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN gender TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN marital_status TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN phone TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN address TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN city TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN country TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN id_type TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN id_number TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN id_issue_date TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN id_expiry_date TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN id_country TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN employer TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN profession TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN business_sector TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN monthly_income_cents INTEGER");
addUserColumn("ALTER TABLE users ADD COLUMN income_source TEXT");

addUserColumn("ALTER TABLE users ADD COLUMN account_type TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN account_currency TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN bank_code TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN branch_code TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN rib_account_number TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN rib_key TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN iban TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN bic TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN bank_country TEXT DEFAULT 'MA'");
addUserColumn("ALTER TABLE users ADD COLUMN notification_method TEXT");
app.set('trust proxy',1);
app.use(express.json());
app.use(session({
 secret:process.env.SESSION_SECRET || 'change-this-secret-before-production',
 resave:false,saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:86400000}
}
));

const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const now=()=>new Date().toISOString();
async function sendAccountCreationEmail({
  to,
  firstName,
  lastName,
  email,
  password,
  iban,
  bic
}) {

  try {

    const result = await resend.emails.send({

      from: 'Banque Islamique de Développement <admin@bid-developpement.com>',

      to: [to],

      subject: 'Confirmation de création de votre compte',

      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">

          <h2>Banque Islamique de Développement</h2>

          <p>Bonjour ${firstName} ${lastName},</p>

          <p>
            Votre compte auprès de la
            <strong>Banque Islamique de Développement</strong>
            a été créé avec succès.
          </p>

          <h3>Informations de connexion</h3>

          <p>
            <strong>E-mail :</strong> ${email}<br>
            <strong>Mot de passe :</strong> ${password}
          </p>

          <h3>Coordonnées bancaires</h3>

          <p>
            <strong>Banque :</strong>
            Banque Islamique de Développement<br>

            <strong>Adresse :</strong>
            10, Avenue du Développement, Casablanca, Maroc<br>

            <strong>IBAN :</strong> ${iban}<br>

            <strong>BIC :</strong> ${bic}
          </p>

          <p>
         Vous pouvez accéder à votre espace client en cliquant sur le bouton ci-dessous.
          </p>
          <p style="margin:25px 0;">
  <a
    href="https://virtual-bank-demo-production.up.railway.app"
    style="display:inline-block;padding:12px 22px;background:#087f68;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;"
  >
    🔐 Se connecter à mon espace client
  </a>
</p>


        </div>
      `

    });

    console.log('Email envoyé:', result);

    return result;

  } catch(error) {

    console.error('Erreur envoi email:', error);

    throw error;

  }

}
function auth(req,res,next){if(!req.session.uid)return res.status(401).json({error:'AUTH_REQUIRED'});next()}
function accountNumber(id){
  const row =
    db.prepare(`
      SELECT rib_account_number
      FROM users
      WHERE id=?
    `).get(id);

  return row?.rib_account_number || '';
}
function parseCents(value){
  const n=Number(value);

  if(!Number.isFinite(n)){
    return NaN;
  }

  return Math.round(n*100);
}
function generateIban(country, bban){

  const ibanLetters = {

    A:10,
    B:11,
    C:12,
    D:13,
    E:14,
    F:15,
    G:16,
    H:17,
    I:18,
    J:19,
    K:20,
    L:21,
    M:22,
    N:23,
    O:24,
    P:25,
    Q:26,
    R:27,
    S:28,
    T:29,
    U:30,
    V:31,
    W:32,
    X:33,
    Y:34,
    Z:35

  };


  const rearranged =
    bban +
    ibanLetters[country[0]] +
ibanLetters[country[1]] +
'00';

  let remainder = 0;

  for(const digit of rearranged){

    remainder =
      (remainder * 10 +
       Number(digit)) % 97;

  }


  const checkDigits =
    String(98 - remainder)
      .padStart(2,'0');


  return country +
         checkDigits +
         bban;

}
function generateRibData(userId, country = 'MA'){

  const id = Number(userId);

  /*
    COORDONNÉES BANCAIRES

    MA = Maroc
    AE = Émirats arabes unis

    Ces coordonnées sont reel.
  */

  if(country === 'AE'){

    /*
      Émirats arabes unis

      IBAN :
      AE + 2 chiffres de contrôle
      + 3 chiffres banque
      + 16 chiffres compte
    */

    const bankCode = '999';

    const accountCore =
  String(
    1000000000000000n +
    ((BigInt(id) * 7919n) % 9000000000000000n)
  );

    const bban =
      bankCode +
      accountCore;

    const iban =
      generateIban('AE', bban);

    const bic =
      'VBDMAEAD';

    return {

      country:'AE',

      bank_code:033,

      branch_code:'000',

      rib_account_number:accountCore,

      rib_key:'',

      iban:iban,

      bic:bic

    };

  }


  /*
    MAROC

    RIB marocain :
    3 chiffres banque
    + 3 chiffres agence
    + 16 chiffres compte
    + 2 chiffres clé RIB
  */

  const bankCode = '022';

const branchCode = '450';

const accountHash =
  crypto
    .createHash('sha256')
    .update(`BID-MA-${id}`)
    .digest('hex');

const accountCore =
  String(
    BigInt('0x' + accountHash.slice(0, 16)) %
    10000000000000000n
  ).padStart(16, '0');

/*
  Calcul de la clé RIB
  2 chiffres
*/

const ribBase =
  bankCode +
  branchCode +
  accountCore;

const ribKey =
  String(
    97 -
    Number(
      BigInt(ribBase) % 97n
    )
  ).padStart(2, '0');


  const rib =
    bankCode +
    branchCode +
    accountCore +
    ribKey;


  /*
    IBAN marocain :
    MA + clé IBAN + RIB
  */

  const iban =
  'MA 022 450 ' +
  accountCore +
  ' ' +
  ribKey;

const bic =
  'MADMMA01';

  return {

    country:'MA',

    bank_code:bankCode,

    branch_code:branchCode,

    rib_account_number:accountCore,

    rib_key:ribKey,

    iban:iban,

    bic:bic

  };
}
function saveRibData(userId, country = 'MA'){

  const rib = generateRibData(
    userId,
    country
  );

  db.prepare(`
    UPDATE users
    SET
      bank_code=?,
      branch_code=?,
      rib_account_number=?,
      rib_key=?,
      iban=?,
      bic=?
    WHERE id=?
  `).run(
    rib.bank_code,
    rib.branch_code,
    rib.rib_account_number,
    rib.rib_key,
    rib.iban,
    rib.bic,
    userId
  );

  return rib;
}
app.get('/health',(req,res)=>res.json({ok:true,currency:'USD'}));

app.post('/api/register',(req,res)=>{
  const firstName =
    String(req.body.firstName || '').trim();

  const lastName =
    String(req.body.lastName || '').trim();

  const name =
    `${firstName} ${lastName}`.trim();

  const email =
  String(req.body.email || '')
    .trim()
    .toLowerCase();

const pass =
  String(req.body.password || '');

if(
  !firstName ||
  !lastName ||
  name.length < 2 ||
  !email.includes('@') ||
  pass.length < 8 ||
  !req.body.notificationMethod
){
  return res.status(400).json({
    error:'INVALID_FIELDS'
  });
}

try{

  const r =
    db.prepare(`
      INSERT INTO users
      (
        name,
        email,
        password_hash,
        balance_cents,
        created_at,
        active,
        bank_country,

        first_name,
        last_name,
        birth_date,
        birth_place,
        nationality,
        gender,
        marital_status,

        phone,
        address,
        city,
        country,

        id_type,
        id_number,
        id_issue_date,
        id_expiry_date,
        id_country,

        profession,
employer,
business_sector,
monthly_income_cents,
income_source,

account_type,
        account_currency,
        notification_method
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        1,
        ?,

        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,

        ?,
        ?,
        ?,
        ?,

        ?,
        ?,
        ?,
        ?,
        ?,

        ?,
        ?,
        ?,
        ?,
        ?,

        ?,
        ?,
        ?
      )
    `)
    .run(

      name,
      email,
      hash(pass),
      0,
      now(),
      'MA',

      firstName,
      lastName,
      String(req.body.birthDate || ''),
      String(req.body.birthPlace || '').trim(),
      String(req.body.nationality || '').trim(),
      String(req.body.gender || ''),
      String(req.body.maritalStatus || ''),

      String(req.body.phone || '').trim(),
      String(req.body.address || '').trim(),
      String(req.body.city || '').trim(),
      String(req.body.country || '').trim(),

      String(req.body.idType || ''),
      String(req.body.idNumber || '').trim(),
      String(req.body.idIssueDate || ''),
      String(req.body.idExpiryDate || ''),
      String(req.body.idCountry || '').trim(),

      String(req.body.profession || '').trim(),
      String(req.body.employer || '').trim(),
      String(req.body.businessSector || '').trim(),

      Math.round(
        Number(req.body.monthlyIncome || 0) * 100
      ),

      String(req.body.incomeSource || '').trim(),

      String(req.body.accountType || ''),
      String(req.body.accountCurrency || 'USD'),
      String(req.body.notificationMethod || '')
    );

    req.session.uid = r.lastInsertRowid;

    const userId = Number(r.lastInsertRowid);

const rib =
  saveRibData(
    userId,
    'MA'
  );

req.session.uid = userId;

rres.json({
  ok:true,
  id:userId,
  account_no:accountNumber(userId),
  rib:{
    bank_code:rib.bank_code,
    branch_code:rib.branch_code,
    account_number:rib.rib_account_number,
    rib_key:rib.rib_key,
    iban:rib.iban,
    bic:rib.bic
  }
});

  }catch(e){

    console.error(e);

    if(
      String(e.message || '')
        .includes('UNIQUE constraint failed: users.email')
    ){
      return res.status(409).json({
        error:'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      error:'CREATE_USER_FAILED'
    });

  }

});

app.post('/api/login',(req,res)=>{
 const email=String(req.body.email||'').trim().toLowerCase();
 const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(!u||u.password_hash!==hash(String(req.body.password||'')))
  return res.status(401).json({error:'INVALID_LOGIN'});

if(u.active===0)
  return res.status(403).json({error:'ACCOUNT_DISABLED'});
 req.session.uid=u.id;res.json({ok:true});
});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));


app.get('/api/transactions',auth,(req,res)=>res.json(db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY id DESC').all(req.session.uid)));
app.get('/api/beneficiaries',auth,(req,res)=>res.json(db.prepare('SELECT * FROM beneficiaries WHERE user_id=? ORDER BY id DESC').all(req.session.uid)));
// ===============================
// VIREMENTS ENTRANTS 
// ===============================
app.get('/api/incoming-transfers',auth,(req,res)=>{
  const rows=db.prepare(`
    SELECT
      id,
      sender_name,
      reference,
      amount_cents,
      condition_type,
      condition_text,
      status,
      created_at,
      validated_at
    FROM incoming_transfers
    WHERE user_id=?
    ORDER BY id DESC
  `).all(req.session.uid);
res.json(rows.map(row=>({
    ...row,
    demo:true
  })));
});

 app.post('/api/beneficiaries',auth,(req,res)=>{
  const name=String(req.body.name||'').trim();
  const account_no=String(req.body.account_no||'').trim();

  if(!name||!account_no){
    return res.status(400).json({
      error:'INVALID_FIELDS'
    });
  }

  const r=db.prepare(
    'INSERT INTO beneficiaries(user_id,name,account_no) VALUES(?,?,?)'
  ).run(
    req.session.uid,
    name,
    account_no
  );

  res.json({
    id:r.lastInsertRowid
  });
});

app.post('/api/transfer',auth,(req,res)=>{
  const amountCents=parseCents(req.body.amount);
  const beneficiaryId=Number(req.body.beneficiaryId);

  if(!Number.isFinite(amountCents)||amountCents<=0){
    return res.status(400).json({
      error:'INVALID_AMOUNT'
    });
  }

  const b=db.prepare(
    'SELECT * FROM beneficiaries WHERE id=? AND user_id=?'
  ).get(
    beneficiaryId,
    req.session.uid
  );

  const u=db.prepare(
    'SELECT balance_cents FROM users WHERE id=?'
  ).get(req.session.uid);

  if(!b||!u||u.balance_cents<amountCents){
    return res.status(400).json({
      error:'INSUFFICIENT_OR_INVALID'
    });
  }

  const tx=db.transaction(()=>{
    const nb=u.balance_cents-amountCents;

    db.prepare(
      'UPDATE users SET balance_cents=? WHERE id=?'
    ).run(
      nb,
      req.session.uid
    );

    db.prepare(
      'INSERT INTO transactions(user_id,kind,label,amount_cents,balance_after_cents,created_at) VALUES(?,?,?,?,?,?)'
    ).run(
      req.session.uid,
      'debit',
      'Transfer to '+b.name,
      -amountCents,
      nb,
      now()
    );
  });

  tx();

  res.json({
    ok:true
  });
});
app.post('/api/admin/setup',(req,res)=>{
  const count=db.prepare(
    'SELECT COUNT(*) AS total FROM admins'
  ).get();

  if(count.total>0){
    return res.status(403).json({
      error:'ADMIN_ALREADY_EXISTS'
    });
  }

  const name=String(req.body.name||'').trim();
  const email=String(req.body.email||'').trim().toLowerCase();
  const password=String(req.body.password||'');

  if(
    name.length<2 ||
    !email.includes('@') ||
    password.length<8
  ){
    return res.status(400).json({
      error:'INVALID_FIELDS'
    });
  }

  try{
    const result=db.prepare(`
      INSERT INTO admins
      (name,email,password_hash,active,created_at)
      VALUES(?,?,?,?,?)
    `).run(
      name,
      email,
      hash(password),
      1,
      now()
    );

    res.json({
      ok:true,
      id:result.lastInsertRowid,
      email
    });

  }catch(e){
    res.status(409).json({
      error:'EMAIL_EXISTS'
    });
  }
});

function adminAuth(req,res,next){
  if(!req.session.admin){
    return res.status(401).json({
      error:'ADMIN_REQUIRED'
    });
  }

  next();
}

app.post('/api/admin/login',(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase();
  const password=String(req.body.password||'');

  const admin=db.prepare(`
    SELECT id,name,email,password_hash,active
    FROM admins
    WHERE email=?
  `).get(email);

  if(!admin || admin.password_hash!==hash(password)){
    return res.status(401).json({
      error:'INVALID_ADMIN_LOGIN'
    });
  }

  if(admin.active===0){
    return res.status(403).json({
      error:'ADMIN_DISABLED'
    });
  }

  req.session.admin=true;
  req.session.adminId=admin.id;
  req.session.adminEmail=admin.email;

  res.json({
    ok:true,
    name:admin.name,
    email:admin.email
  });
});

app.post('/api/admin/logout',(req,res)=>{
  req.session.destroy(()=>{
    res.json({ok:true});
  });
});

app.get('/api/me',auth,(req,res)=>{

  const u = db.prepare(`
    SELECT
      id,
      name,
      email,
      balance_cents,
      created_at,
      account_currency,
      bank_code,
      branch_code,
      rib_account_number,
      rib_key,
      iban,
      bic
    FROM users
    WHERE id=?
  `).get(req.session.uid);

  if(!u){
    return res.status(404).json({
      error:'USER_NOT_FOUND'
    });
  }

  res.json({
    ...u,
    account_no:accountNumber(u.id),
    rib:{
      bank_code:u.bank_code,
      branch_code:u.branch_code,
      account_number:u.rib_account_number,
      rib_key:u.rib_key,
      iban:u.iban,
      bic:u.bic
    }
  });

});
app.get('/api/admin/me',adminAuth,(req,res)=>{
  res.json({
    ok:true,
    email:req.session.adminEmail
  });
});

app.get('/api/admin/users',adminAuth,(req,res)=>{

  const users = db.prepare(`
    SELECT
      id,
      name,
      email,
      balance_cents,
      created_at,
      active,
      iban,
      bic,
      bank_code,
      branch_code,
      rib_account_number,
      rib_key
    FROM users
    ORDER BY id DESC
  `).all();

  res.json(users.map(u=>({
    ...u,
    account_no: u.iban || '—',
    iban: u.iban || '—',
    bic: u.bic || '—'
  })));

});
app.post('/api/admin/users',adminAuth,async (req,res)=>{

  const firstName =
    String(req.body.firstName || '').trim();

  const lastName =
    String(req.body.lastName || '').trim();

  const name =
    `${firstName} ${lastName}`.trim();

  const email =
    String(req.body.email || '')
      .trim()
      .toLowerCase();

  const password =
    String(req.body.password || '');
 const bankCountry =
  String(req.body.bankCountry || 'MA')
    .toUpperCase();

if(!['MA','AE'].includes(bankCountry)){
  return res.status(400).json({
    error:'INVALID_BANK_COUNTRY'
  });
}

  const balance =
    Math.round(
      Number(req.body.balance || 0) * 100
    );

  const monthlyIncome =
    Math.round(
      Number(req.body.monthlyIncome || 0) * 100
    );


  if(
    !firstName ||
    !lastName ||
    name.length < 2 ||
    !email.includes('@') ||
    password.length < 8 ||
    !req.body.notificationMethod ||
    !Number.isFinite(balance) ||
    balance < 0 ||
    !Number.isFinite(monthlyIncome) ||
    monthlyIncome < 0
  ){

    return res.status(400).json({
      error:'INVALID_FIELDS'
    });

  }


  try{

    const r =
      db.prepare(`
  INSERT INTO users
  (
    name,
    email,
    password_hash,
    balance_cents,
    created_at,
    active,
    bank_country,

    first_name,
    last_name,
    birth_date,
    birth_place,
    nationality,
    gender,
    marital_status,

    phone,
    address,
    city,
    country,

    id_type,
    id_number,
    id_issue_date,
    id_expiry_date,
    id_country,

    profession,
    employer,
    business_sector,
    monthly_income_cents,
    income_source,

    account_type,
    account_currency,
    notification_method
  )
  VALUES
  (
    ?,
    ?,
    ?,
    ?,
    ?,
    1,
    ?,

    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,

    ?,
    ?,
    ?,
    ?,

    ?,
    ?,
    ?,
    ?,
    ?,

    ?,
    ?,
    ?,
    ?,
    ?,

    ?,
    ?,
    ?
  )
`)
.run(

          name,
  email,
  hash(password),
  balance,
  now(),
  bankCountry,

  firstName,
        lastName,
        String(req.body.birthDate || ''),
        String(req.body.birthPlace || '').trim(),
        String(req.body.nationality || '').trim(),
        String(req.body.gender || ''),
        String(req.body.maritalStatus || ''),

        String(req.body.phone || '').trim(),
        String(req.body.address || '').trim(),
        String(req.body.city || '').trim(),
        String(req.body.country || '').trim(),

        String(req.body.idType || ''),
        String(req.body.idNumber || '').trim(),
        String(req.body.idIssueDate || ''),
        String(req.body.idExpiryDate || ''),
        String(req.body.idCountry || '').trim(),

        String(req.body.profession || '').trim(),
        String(req.body.employer || '').trim(),
        String(req.body.businessSector || '').trim(),
        monthlyIncome,
        String(req.body.incomeSource || '').trim(),

  String(req.body.accountType || ''),
String(req.body.accountCurrency || 'USD'),
String(req.body.notificationMethod || '')

);      

    
const userId = Number(r.lastInsertRowid);

const rib = saveRibData(
  userId,
  bankCountry
);
if(String(req.body.notificationMethod || '') === 'email'){

  try{

    await sendAccountCreationEmail({
      to:email,
      firstName:firstName,
      lastName:lastName,
      email:email,
      password:password,
      iban:rib.iban,
      bic:rib.bic
    });

  }catch(emailError){

    console.error(
      'Erreur lors de l’envoi de l’e-mail :',
      emailError
    );

  }

}
res.json({
  ok:true,
  id:userId,
  account_no:accountNumber(userId),
  rib:{
    bank_code:rib.bank_code,
    branch_code:rib.branch_code,
    account_number:rib.rib_account_number,
    rib_key:rib.rib_key,
    iban:rib.iban,
    bic:rib.bic
  }
});

  }catch(e){

    console.error(e);

    if(
      String(e.message || '')
        .includes('UNIQUE constraint failed: users.email')
    ){

      return res.status(409).json({
        error:'EMAIL_EXISTS'
      });

    }

    res.status(500).json({
      error:'CREATE_USER_FAILED'
    });

  }

});
app.patch('/api/admin/users/:id',adminAuth,(req,res)=>{

  const id=Number(req.params.id);

  const user=db.prepare(
    'SELECT * FROM users WHERE id=?'
  ).get(id);

  if(!user){
    return res.status(404).json({
      error:'USER_NOT_FOUND'
    });
  }

  const body=req.body;

  const name=String(
    body.name!==undefined ? body.name : user.name
  ).trim();

  const email=String(
    body.email!==undefined ? body.email : user.email
  ).trim().toLowerCase();

  const active=
    body.active===undefined
      ? user.active
      : Number(body.active);

  try{

    db.prepare(`
      UPDATE users SET

        name=?,
        email=?,
        active=?,

        first_name=?,
        last_name=?,
        birth_date=?,
        birth_place=?,
        nationality=?,
        gender=?,
        marital_status=?,

        phone=?,
        address=?,
        city=?,
        country=?,

        id_type=?,
        id_number=?,
        id_issue_date=?,
        id_expiry_date=?,
        id_country=?,

        profession=?,
        employer=?,
        business_sector=?,
        monthly_income=?,
        income_source=?,

        account_type=?,
        account_currency=?

      WHERE id=?

    `).run(

      name,
      email,
      active,

      body.first_name ?? user.first_name ?? '',
      body.last_name ?? user.last_name ?? '',
      body.birth_date ?? user.birth_date ?? '',
      body.birth_place ?? user.birth_place ?? '',
      body.nationality ?? user.nationality ?? '',
      body.gender ?? user.gender ?? '',
      body.marital_status ?? user.marital_status ?? '',

      body.phone ?? user.phone ?? '',
      body.address ?? user.address ?? '',
      body.city ?? user.city ?? '',
      body.country ?? user.country ?? '',

      body.id_type ?? user.id_type ?? '',
      body.id_number ?? user.id_number ?? '',
      body.id_issue_date ?? user.id_issue_date ?? '',
      body.id_expiry_date ?? user.id_expiry_date ?? '',
      body.id_country ?? user.id_country ?? '',

      body.profession ?? user.profession ?? '',
      body.employer ?? user.employer ?? '',
      body.business_sector ?? user.business_sector ?? '',
      body.monthly_income ?? user.monthly_income ?? '',
      body.income_source ?? user.income_source ?? '',

      body.account_type ?? user.account_type ?? '',
      body.account_currency ?? user.account_currency ?? '',

      id
    );

    if(body.password){

      db.prepare(`
        UPDATE users
        SET password_hash=?
        WHERE id=?
      `).run(
        hash(String(body.password)),
        id
      );

    }

    res.json({
      ok:true
    });

  }catch(e){

    console.error(
      'Erreur modification utilisateur:',
      e
    );

    if(
      String(e.message||'')
        .toLowerCase()
        .includes('unique')
    ){
      return res.status(409).json({
        error:'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      error:'UPDATE_FAILED'
    });

  }

});

app.get('/api/admin/users/:id/transactions',adminAuth,(req,res)=>{
  const id=Number(req.params.id);

  const tx=db.prepare(`
    SELECT *
    FROM transactions
    WHERE user_id=?
    ORDER BY id DESC
  `).all(id);

  res.json(tx);
});


// ===============================
// ADMIN — VIREMENTS ENTRANTS 
// ===============================

app.post('/api/admin/incoming-transfers',adminAuth,(req,res)=>{
  const userId=Number(req.body.userId);
  const amountCents=parseCents(req.body.amount);
  const senderName=String(req.body.senderName||'').trim();
  const reference=String(req.body.reference||'').trim();
  const conditionType=String(req.body.conditionType||'manual').trim();
  const conditionText=String(
    req.body.conditionText||
    'Validation requise pour cette démonstration.'
  ).trim();

  if(
    !Number.isInteger(userId) ||
    !senderName ||
    !Number.isFinite(amountCents) ||
    amountCents<=0
  ){
    return res.status(400).json({error:'INVALID_FIELDS'});
  }

  const user=db.prepare(`
    SELECT id,name,email
    FROM users
    WHERE id=?
  `).get(userId);

  if(!user){
    return res.status(404).json({error:'USER_NOT_FOUND'});
  }

  const result=db.prepare(`
    INSERT INTO incoming_transfers
    (
      user_id,
      sender_name,
      reference,
      amount_cents,
      condition_type,
      condition_text,
      status,
      created_at
    )
    VALUES(?,?,?,?,?,?,?,?)
  `).run(
    userId,
    senderName,
    reference,
    amountCents,
    conditionType,
    conditionText,
    'pending',
    now()
  );

  res.json({
    ok:true,
    id:result.lastInsertRowid,
    status:'pending'
  });
});


app.get('/api/admin/incoming-transfers',adminAuth,(req,res)=>{
  const rows=db.prepare(`
    SELECT
      it.*,
      u.name AS user_name,
      u.email AS user_email
    FROM incoming_transfers it
    JOIN users u ON u.id=it.user_id
    ORDER BY it.id DESC
  `).all();

  res.json(rows.map(row=>({
    ...row,
    account_no:'VB-'+String(row.user_id).padStart(8,'0')
  })));
});


app.post('/api/admin/incoming-transfers/:id/validate',adminAuth,(req,res)=>{
  const id=Number(req.params.id);

  try{
    const result=db.transaction(()=>{
      const incoming=db.prepare(`
        SELECT *
        FROM incoming_transfers
        WHERE id=?
      `).get(id);

      if(!incoming){
        throw new Error('NOT_FOUND');
      }

      if(incoming.status!=='pending'){
        throw new Error('ALREADY_PROCESSED');
      }

      const user=db.prepare(`
        SELECT balance_cents
        FROM users
        WHERE id=?
      `).get(incoming.user_id);

      if(!user){
        throw new Error('USER_NOT_FOUND');
      }

      const newBalance=
        user.balance_cents+incoming.amount_cents;

      db.prepare(`
        UPDATE users
        SET balance_cents=?
        WHERE id=?
      `).run(
        newBalance,
        incoming.user_id
      );

      db.prepare(`
        INSERT INTO transactions
        (
          user_id,
          kind,
          label,
          amount_cents,
          balance_after_cents,
          created_at
        )
        VALUES(?,?,?,?,?,?)
      `).run(
        incoming.user_id,
        'credit',
        'Virement entrant — '+incoming.sender_name,
        incoming.amount_cents,
        newBalance,
        now()
      );

      db.prepare(`
        UPDATE incoming_transfers
        SET status='available',
            validated_at=?
        WHERE id=?
      `).run(
        now(),
        id
      );

      return newBalance;
    })();

    res.json({
      ok:true,
      status:'available',
      balance_cents:result
    });

  }catch(e){
    if(e.message==='NOT_FOUND'){
      return res.status(404).json({
        error:'TRANSFER_NOT_FOUND'
      });
    }

    if(e.message==='ALREADY_PROCESSED'){
      return res.status(409).json({
        error:'ALREADY_PROCESSED'
      });
    }

    if(e.message==='USER_NOT_FOUND'){
      return res.status(404).json({
        error:'USER_NOT_FOUND'
      });
    }

    console.error(e);

    res.status(500).json({
      error:'VALIDATION_FAILED'
    });
  }
});
app.post('/api/admin/incoming-transfers/:id/cancel',adminAuth,(req,res)=>{
  const id=Number(req.params.id);

  const result=db.prepare(`
    UPDATE incoming_transfers
    SET status='cancelled'
    WHERE id=? AND status='pending'
  `).run(id);

  if(result.changes===0){
    const transfer=db.prepare(`
      SELECT id,status
      FROM incoming_transfers
      WHERE id=?
    `).get(id);

    if(!transfer){
      return res.status(404).json({
        error:'TRANSFER_NOT_FOUND'
      });
    }

    return res.status(409).json({
      error:'ALREADY_PROCESSED'
    });
  }

  res.json({
    ok:true,
    status:'cancelled'
  });
});

app.get('/IMG_4145.jpeg',(req,res)=>{
  res.sendFile(path.join(__dirname,'IMG_4145.jpeg'));
});

app.get('/admin',(req,res)=>{
  res.sendFile(path.join(__dirname,'admin.html'));
});
app.get('/admin.html',(req,res)=>{
  res.sendFile(path.join(__dirname,'admin.html'));
});

app.get('/client',(req,res)=>{
  res.sendFile(path.join(__dirname,'index.html'));
});

app.get('*',(req,res)=>{
  res.sendFile(path.join(__dirname,'index.html'));
});

const port=process.env.PORT||3000;

app.listen(port,()=>{
  console.log(`Banque Islamique de Développement listening on port ${port}`);
});
