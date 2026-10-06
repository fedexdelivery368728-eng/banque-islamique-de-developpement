const express=require('express');
const session=require('express-session');
const Database=require('better-sqlite3');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const PDFDocument=require('pdfkit');
const QRCode=require('qrcode');
const { Resend } = require('resend');
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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

CREATE TABLE IF NOT EXISTS external_transfers(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 source_type TEXT NOT NULL,
 source_user_id INTEGER,
 source_admin_id INTEGER,
 beneficiary_name TEXT NOT NULL,
 beneficiary_country TEXT NOT NULL DEFAULT '',
 bank_name TEXT NOT NULL DEFAULT '',
 account_no TEXT NOT NULL DEFAULT '',
 iban TEXT NOT NULL DEFAULT '',
 bic TEXT NOT NULL DEFAULT '',
 amount_cents INTEGER NOT NULL,
 currency TEXT NOT NULL DEFAULT 'USD',
 reason TEXT NOT NULL DEFAULT '',
 beneficiary_email TEXT NOT NULL DEFAULT '',
 beneficiary_phone TEXT NOT NULL DEFAULT '',
 notification_method TEXT NOT NULL DEFAULT 'email',
 notification_language TEXT NOT NULL DEFAULT 'fr',
 bank_origin_country TEXT NOT NULL DEFAULT 'Maroc',
 bank_origin_address TEXT NOT NULL DEFAULT '10, Avenue du Développement, Casablanca, Maroc',
 status TEXT NOT NULL DEFAULT 'pending_verification',
 condition_text TEXT NOT NULL DEFAULT '',
 condition_completed INTEGER NOT NULL DEFAULT 0,
 provider TEXT NOT NULL DEFAULT '',
 provider_transfer_id TEXT NOT NULL DEFAULT '',
 provider_status TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 completed_at TEXT,
 FOREIGN KEY(source_user_id) REFERENCES users(id),
 FOREIGN KEY(source_admin_id) REFERENCES admins(id)
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

function addExternalTransferColumn(sql){
 try{
  db.prepare(sql).run();
 }catch(e){}
}
addExternalTransferColumn("ALTER TABLE external_transfers ADD COLUMN notification_method TEXT NOT NULL DEFAULT 'email'");
addExternalTransferColumn("ALTER TABLE external_transfers ADD COLUMN notification_language TEXT NOT NULL DEFAULT 'fr'");
addExternalTransferColumn("ALTER TABLE external_transfers ADD COLUMN bank_origin_country TEXT NOT NULL DEFAULT 'Maroc'");
addExternalTransferColumn("ALTER TABLE external_transfers ADD COLUMN bank_origin_address TEXT NOT NULL DEFAULT '10, Avenue du Développement, Casablanca, Maroc'");
addUserColumn("ALTER TABLE users ADD COLUMN first_name TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN last_name TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN birth_date TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN birth_place TEXT");
addUserColumn("ALTER TABLE users ADD COLUMN nationality TEXT");
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
addUserColumn("ALTER TABLE users ADD COLUMN notification_language TEXT NOT NULL DEFAULT 'fr'");

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
  bic,
    language = 'fr'
}) {

  if (!resend) {
    console.log('Resend non configuré : email de création de compte ignoré en local.');
    return;
  }

  const lang = ['fr', 'en', 'ar'].includes(language)
    ? language
    : 'fr';

  const translations = {

    fr: {
      subject: 'Confirmation de création de votre compte',
      greeting: `Bonjour ${firstName} ${lastName},`,
      created: 'Votre compte auprès de la Banque Islamique de Développement a été créé avec succès.',
      loginInfo: 'Informations de connexion',
      email: 'E-mail',
      password: 'Mot de passe',
      bankInfo: 'Coordonnées bancaires',
      bank: 'Banque',
      address: 'Adresse',
      iban: 'IBAN',
      bic: 'BIC',
      access: 'Vous pouvez accéder à votre espace client en cliquant sur le bouton ci-dessous.',
      button: '🔐 Se connecter à mon espace client'
    },

    en: {
      subject: 'Confirmation of your account creation',
      greeting: `Hello ${firstName} ${lastName},`,
      created: 'Your account with Banque Islamique de Développement has been successfully created.',
      loginInfo: 'Login information',
      email: 'Email',
      password: 'Password',
      bankInfo: 'Bank details',
      bank: 'Bank',
      address: 'Address',
      iban: 'IBAN',
      bic: 'BIC',
      access: 'You can access your client area by clicking the button below.',
      button: '🔐 Sign in to your client area'
    },

    ar: {
      subject: 'تأكيد إنشاء حسابك',
      greeting: `مرحباً ${firstName} ${lastName}،`,
      created: 'تم إنشاء حسابك لدى بنك التنمية الإسلامي بنجاح.',
      loginInfo: 'معلومات تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      bankInfo: 'البيانات المصرفية',
      bank: 'البنك',
      address: 'العنوان',
      iban: 'IBAN',
      bic: 'BIC',
      access: 'يمكنك الدخول إلى مساحة العميل الخاصة بك من خلال الضغط على الزر أدناه.',
      button: '🔐 تسجيل الدخول إلى مساحة العميل'
    }

  };

  const t = translations[lang];

  const direction = lang === 'ar' ? 'rtl' : 'ltr';

  try {

    const result = await resend.emails.send({

      from: 'Banque Islamique de Développement <admin@bid-developpement.com>',

      to: [to],

      subject: t.subject,

      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">

        <h2>Banque Islamique de Développement</h2>

<p>${t.greeting}</p>

<p>
  ${t.created}
</p>

<h3>${t.loginInfo}</h3>

          <p>
          <strong>${t.email} :</strong> ${email}<br>
<strong>${t.password} :</strong> ${password}


          <h3>${t.bankInfo}</h3>

<p>
  <strong>${t.bank} :</strong>
  Banque Islamique de Développement<br>

  <strong>${t.address} :</strong>
  10, Avenue du Développement, Casablanca, Maroc<br>

  <strong>${t.iban} :</strong> ${iban}<br>

  <strong>${t.bic} :</strong> ${bic}
</p>

          <p>
  ${t.access}
</p>

<p style="margin:25px 0;">
  <a
    href="https://virtual-bank-demo-production.up.railway.app"
    style="display:inline-block;padding:12px 22px;background:#087f68;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;"
  >
    ${t.button}
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

async function generateExternalTransferPdf(transfer, sourceUser){

  const doc=new PDFDocument({
    size:'A4',
    margin:45
  });

  const chunks=[];

  doc.on('data',chunk=>chunks.push(chunk));

  const finished=new Promise((resolve,reject)=>{
    doc.on('end',()=>resolve(Buffer.concat(chunks)));
    doc.on('error',reject);
  });

  const orderNumber=
    'OV-'+String(transfer.id).padStart(8,'0');

  const verificationUrl=
    'https://bid-developpement.com/verification/'+
    encodeURIComponent(orderNumber);

  const qrDataUrl=
    await QRCode.toDataURL(verificationUrl,{
      width:180,
      margin:1,
      errorCorrectionLevel:'M'
    });

  const qrBuffer=
    Buffer.from(
      qrDataUrl.replace(/^data:image\/png;base64,/,''),
      'base64'
    );

  const amount=
    (Number(transfer.amount_cents||0)/100)
      .toLocaleString('fr-FR',{
        minimumFractionDigits:2,
        maximumFractionDigits:2
      });

  const createdAt=
    transfer.created_at
      ? new Date(transfer.created_at).toLocaleString('fr-FR')
      : '—';

  const sourceName=
    sourceUser?.name ||
    sourceUser?.email ||
    '—';

  const status=
    transfer.status || '—';

  const notification=
    transfer.notification_method === 'sms'
      ? 'SMS'
      : 'Email';

  const logoPath=path.join(__dirname,'IMG_4145.jpeg');

  if(fs.existsSync(logoPath)){
    doc.image(
      logoPath,
      235,
      40,
      {
        fit:[125,70]
      }
    );

    doc.y=125;
  }

  doc
    .fillColor('#073d34')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Banque Islamique de Développement',{
      align:'center'
    });

  doc
    .moveDown(0.5)
    .fontSize(18)
    .text('ORDRE DE VIREMENT',{
      align:'center'
    });

  doc
    .moveDown(0.3)
    .fontSize(10)
    .fillColor('#087f68')
    .font('Helvetica-Bold')
    .text('DOCUMENT DE SIMULATION',{
      align:'center'
    });

  doc.moveDown(1);

  doc
    .fillColor('#222')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Numéro de l’ordre : ',{continued:true})
    .font('Helvetica')
    .text(orderNumber);

  doc
    .font('Helvetica-Bold')
    .text('Date : ',{continued:true})
    .font('Helvetica')
    .text(createdAt);

  doc.moveDown(0.8);

  function sectionTitle(title){
    doc
      .fillColor('#073d34')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(title);

    doc
      .moveTo(45,doc.y+3)
      .lineTo(550,doc.y+3)
      .strokeColor('#087f68')
      .stroke();

    doc.moveDown(0.5);
  }

  function field(label,value){
    doc
      .fillColor('#222')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(label+': ',{continued:true})
      .font('Helvetica')
      .text(String(value||'—'));

    doc.moveDown(0.15);
  }

  sectionTitle('Banque émettrice');

  field(
    'Banque',
    'Banque Islamique de Développement'
  );

  field(
    'Pays / implantation',
    transfer.bank_origin_country
  );

  field(
    'Adresse',
    transfer.bank_origin_address
  );

  sectionTitle('Donneur d’ordre');

  field('Nom',sourceName);

  field(
    'Compte',
    sourceUser?.iban || sourceUser?.rib_account_number || '—'
  );

  sectionTitle('Bénéficiaire');

  field('Nom',transfer.beneficiary_name);

  field('Pays',transfer.beneficiary_country);

  sectionTitle('Banque bénéficiaire');

  field('Banque',transfer.bank_name);

  field(
    'Compte / IBAN',
    transfer.iban || transfer.account_no || '—'
  );

  field('BIC / SWIFT',transfer.bic);

  sectionTitle('Détails du virement');

  field(
    'Montant',
    amount+' '+(transfer.currency||'USD')
  );

  field('Motif',transfer.reason);

  field(
    'Condition du virement',
    transfer.condition_text
  );

  field('Statut',status);

  field('Notification',notification);

  doc.moveDown(1);

  const qrX=410;
  const qrY=doc.y;

  doc
    .image(qrBuffer,qrX,qrY,{
      width:115,
      height:115
    });

  doc
    .fontSize(8)
    .fillColor('#555')
    .text(
      'Vérification en ligne',
      qrX,
      qrY+120,
      {
        width:115,
        align:'center'
      }
    );

  doc
    .fontSize(7)
    .text(
      orderNumber,
      qrX,
      qrY+133,
      {
        width:115,
        align:'center'
      }
    );

  doc
    .fillColor('#073d34')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(
      'DOCUMENT DE SIMULATION',
      45,
      760,
      {
        width:505,
        align:'center'
      }
    );

  doc.end();

  return finished;
}

async function sendTransactionEmail({
  to,
  name,
  subject,
  title,
  message,
  amountCents,
  balanceCents,
  showBalance=true,
  language='fr'
}) {

  if (!resend) {
    console.log('Resend non configuré : email de transaction ignoré en local.');
    return;
  }

  const lang = ['fr','en','ar'].includes(language)
    ? language
    : 'fr';

  const direction = lang === 'ar' ? 'rtl' : 'ltr';

  const translations = {

    fr: {
      greeting: `Bonjour ${name},`,
      amount: 'Montant',
      balance: 'Solde après opération',
      notice: "Cette notification vous informe d'une nouvelle opération enregistrée sur votre compte."
    },

    en: {
      greeting: `Hello ${name},`,
      amount: 'Amount',
      balance: 'Balance after transaction',
      notice: 'This notification informs you of a new transaction recorded on your account.'
    },

    ar: {
      greeting: `مرحباً ${name}،`,
      amount: 'المبلغ',
      balance: 'الرصيد بعد العملية',
      notice: 'يُعلمك هذا الإشعار بوجود عملية جديدة مسجلة على حسابك.'
    }

  };

  const t = translations[lang];

  try {

    const amount =
      (Math.abs(amountCents) / 100).toFixed(2);

    const balance =
      (balanceCents / 100).toFixed(2);

    await resend.emails.send({

      from:
        'Banque Islamique de Développement <admin@bid-developpement.com>',

      to: [to],

      subject,

      html: `
        <div
          dir="${direction}"
          lang="${lang}"
          style="font-family:Arial,sans-serif;line-height:1.6"
        >

          <h2>Banque Islamique de Développement</h2>

          <p>${t.greeting}</p>

          <h3>${title}</h3>

          <p>${message}</p>

          <p>
            <strong>${t.amount} :</strong>
            ${amount} USD

            ${
              showBalance
                ? `<br><strong>${t.balance} :</strong> ${balance} USD`
                : ''
            }
          </p>

          <p>
            ${t.notice}
          </p>

        </div>
      `

    });

    console.log(
      'Notification transaction envoyée à:',
      to
    );

  } catch(error) {

    console.error(
      'Erreur notification transaction:',
      error
    );

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
notification_method,
notification_language
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
String(req.body.notificationMethod || ''),
String(req.body.notificationLanguage || 'fr')
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

const client=db.prepare(`
  SELECT name,email,balance_cents,notification_language
  FROM users
  WHERE id=?
`).get(req.session.uid);

if(client && client.email){

  sendTransactionEmail({

    to:client.email,

    name:client.name,

    subject:'Confirmation de votre virement',

    title:'Virement effectué',

    message:
      'Votre virement a été effectué avec succès vers ' +
      b.name +
      '.',

        amountCents:amountCents,

    balanceCents:client.balance_cents,

    language:client.notification_language || 'fr'

  });

}

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
  bic:rib.bic,
  language:String(req.body.notificationLanguage || 'fr')
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
app.delete('/api/admin/users/:id',adminAuth,(req,res)=>{
  const id=Number(req.params.id);

  if(!Number.isInteger(id)||id<1){
    return res.status(400).json({
      error:'INVALID_ID'
    });
  }

  try{
    const deleteUser=db.transaction(()=>{
      const user=db.prepare(
        'SELECT id FROM users WHERE id=?'
      ).get(id);

      if(!user){
        throw new Error('USER_NOT_FOUND');
      }

      db.prepare(
        'DELETE FROM transactions WHERE user_id=?'
      ).run(id);

      db.prepare(
        'DELETE FROM beneficiaries WHERE user_id=?'
      ).run(id);

      db.prepare(
        'DELETE FROM incoming_transfers WHERE user_id=?'
      ).run(id);

      db.prepare(
        'DELETE FROM external_transfers WHERE source_user_id=?'
      ).run(id);

      db.prepare(
        'DELETE FROM users WHERE id=?'
      ).run(id);
    });

    deleteUser();

    res.json({
      ok:true
    });

  }catch(e){

    if(e.message==='USER_NOT_FOUND'){
      return res.status(404).json({
        error:'USER_NOT_FOUND'
      });
    }

    console.error(
      'ADMIN_USER_DELETE_FAILED:',
      e
    );

    res.status(500).json({
      error:'USER_DELETE_FAILED'
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


app.post('/api/external-transfers',auth,(req,res)=>{
  try{

    const userId=req.session.uid;

    const beneficiaryName=String(req.body.beneficiaryName||'').trim();
    const beneficiaryCountry=String(req.body.beneficiaryCountry||'').trim();
    const bankName=String(req.body.bankName||'').trim();
    const accountNo=String(req.body.accountNo||'').trim();
    const iban=String(req.body.iban||'').trim();
    const bic=String(req.body.bic||'').trim();
    const currency=String(req.body.currency||'USD').trim().toUpperCase();
    const reason=String(req.body.reason||'').trim();
    const conditionText=String(req.body.conditionText||'').trim();
    const beneficiaryEmail=String(req.body.beneficiaryEmail||'').trim();
    const beneficiaryPhone=String(req.body.beneficiaryPhone||'').trim();
    const notificationMethod=String(req.body.notificationMethod||'email').trim().toLowerCase();
    const notificationLanguage=String(req.body.notificationLanguage||'fr').trim().toLowerCase();
    const bankOriginCountry=String(req.body.bankOriginCountry||'').trim().toUpperCase();

    const bankOrigins={
      MA:{
        country:'Maroc',
        address:'10, Avenue du Développement, Casablanca, Maroc'
      },
      AE:{
        country:'Émirats arabes unis (Dubaï)',
        address:'Head Office Building 2, Al Maktoum Road (en face de Dnata), Deira, Dubai, United Arab Emirates'
      }
    };

    const bankOrigin=bankOrigins[bankOriginCountry];

    if(!bankOrigin){
      return res.status(400).json({error:'INVALID_BANK_ORIGIN'});
    }

    const amountCents=parseCents(req.body.amount);

    if(!['email','sms'].includes(notificationMethod)){
      return res.status(400).json({error:'INVALID_NOTIFICATION_METHOD'});
    }

    if(!['fr','en','ar'].includes(notificationLanguage)){
      return res.status(400).json({error:'INVALID_NOTIFICATION_LANGUAGE'});
    }

    if(!beneficiaryName){
      return res.status(400).json({error:'BENEFICIARY_NAME_REQUIRED'});
    }

    if(!beneficiaryCountry){
      return res.status(400).json({error:'BENEFICIARY_COUNTRY_REQUIRED'});
    }

    if(!bankName){
      return res.status(400).json({error:'BANK_NAME_REQUIRED'});
    }

    if(!accountNo && !iban){
      return res.status(400).json({error:'ACCOUNT_OR_IBAN_REQUIRED'});
    }

    if(!bic){
      return res.status(400).json({error:'BIC_REQUIRED'});
    }

    if(!Number.isFinite(amountCents) || amountCents<=0){
      return res.status(400).json({error:'INVALID_AMOUNT'});
    }

    if(!conditionText){
      return res.status(400).json({error:'CONDITION_REQUIRED'});
    }

    const now=new Date().toISOString();

    const result=db.prepare(`
      INSERT INTO external_transfers(
        source_type,
        source_user_id,
        beneficiary_name,
        beneficiary_country,
        bank_name,
        account_no,
        iban,
        bic,
        amount_cents,
        currency,
        reason,
        beneficiary_email,
beneficiary_phone,
notification_method,
notification_language,
status,
        condition_text,
        condition_completed,
        provider,
        provider_transfer_id,
        provider_status,
        created_at,
        updated_at
      )
      VALUES(
        'client',
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
        'pending_verification',
        ?,
        0,
        '',
        '',
        '',
        ?,
        ?
      )
    `).run(
      userId,
      beneficiaryName,
      beneficiaryCountry,
      bankName,
      accountNo,
      iban,
      bic,
      amountCents,
      currency,
      reason,
      beneficiaryEmail,
      beneficiaryPhone,
            notificationMethod,
      notificationLanguage,
      now(),
      now()
    );

    res.json({
      ok:true,
      transferId:result.lastInsertRowid,
      status:'pending_verification'
    });

  }catch(error){

    console.error('Erreur création virement externe client:',error);

    res.status(500).json({
      error:'EXTERNAL_TRANSFER_CREATE_FAILED'
    });

  }
});

app.get('/api/admin/external-transfers',adminAuth,(req,res)=>{
  try{

    const rows=db.prepare(`
      SELECT
        et.*,
        u.name AS source_user_name,
        u.email AS source_user_email
      FROM external_transfers et
      LEFT JOIN users u
        ON u.id=et.source_user_id
      ORDER BY et.id DESC
    `).all();

    res.json(rows);

  }catch(error){

    console.error(
      'Erreur chargement virements externes admin:',
      error
    );

    res.status(500).json({
      error:'ADMIN_EXTERNAL_TRANSFERS_LOAD_FAILED'
    });

  }
});



app.get('/api/admin/external-transfers/:id/pdf',adminAuth,async (req,res)=>{
  try{

    const transferId=Number(req.params.id);

    if(!Number.isInteger(transferId) || transferId<=0){
      return res.status(400).json({
        error:'INVALID_TRANSFER_ID'
      });
    }

    const transfer=db.prepare(`
      SELECT *
      FROM external_transfers
      WHERE id=?
    `).get(transferId);

    if(!transfer){
      return res.status(404).json({
        error:'TRANSFER_NOT_FOUND'
      });
    }

    let sourceUser=null;

    if(transfer.source_user_id){
      sourceUser=db.prepare(`
        SELECT *
        FROM users
        WHERE id=?
      `).get(transfer.source_user_id);
    }

    const pdfBuffer=
      await generateExternalTransferPdf(
        transfer,
        sourceUser
      );

    const orderNumber=
      'OV-'+String(transfer.id).padStart(8,'0');

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      'inline; filename="ordre-virement-simulation-'+
      orderNumber+
      '.pdf"'
    );

    res.send(pdfBuffer);

  }catch(error){

    console.error(
      'Erreur génération PDF ordre de virement:',
      error
    );

    res.status(500).json({
      error:'PDF_GENERATION_FAILED'
    });

  }
});

app.post('/api/admin/external-transfers',adminAuth,(req,res)=>{
  try{

    const adminId=req.session.admin.id;

    const sourceUserId=Number(req.body.sourceUserId);

    const beneficiaryName=String(req.body.beneficiaryName||'').trim();
    const beneficiaryCountry=String(req.body.beneficiaryCountry||'').trim();
    const bankName=String(req.body.bankName||'').trim();
    const accountNo=String(req.body.accountNo||'').trim();
    const iban=String(req.body.iban||'').trim();
    const bic=String(req.body.bic||'').trim();
    const currency=String(req.body.currency||'USD').trim().toUpperCase();
    const reason=String(req.body.reason||'').trim();
    const conditionText=String(req.body.conditionText||'').trim();
    const beneficiaryEmail=String(req.body.beneficiaryEmail||'').trim();
    const beneficiaryPhone=String(req.body.beneficiaryPhone||'').trim();
    const notificationMethod=String(req.body.notificationMethod||'email').trim().toLowerCase();
    const notificationLanguage=String(req.body.notificationLanguage||'fr').trim().toLowerCase();

    const bankOriginCountry=String(req.body.bankOriginCountry||'').trim().toUpperCase();

    const bankOrigins={
      MA:{
        country:'Maroc',
        address:'10, Avenue du Développement, Casablanca, Maroc'
      },
      AE:{
        country:'Émirats arabes unis (Dubaï)',
        address:'Head Office Building 2, Al Maktoum Road (en face de Dnata), Deira, Dubai, United Arab Emirates'
      }
    };

    const bankOrigin=bankOrigins[bankOriginCountry];

    if(!bankOrigin){
      return res.status(400).json({error:'INVALID_BANK_ORIGIN'});
    }

    const amountCents=parseCents(req.body.amount);

    if(!['email','sms'].includes(notificationMethod)){
      return res.status(400).json({error:'INVALID_NOTIFICATION_METHOD'});
    }

    if(!['fr','en','ar'].includes(notificationLanguage)){
      return res.status(400).json({error:'INVALID_NOTIFICATION_LANGUAGE'});
    }

    if(!Number.isInteger(sourceUserId) || sourceUserId<=0){
      return res.status(400).json({error:'SOURCE_ACCOUNT_REQUIRED'});
    }

    const sourceUser=db.prepare(`
      SELECT id,name,email,balance_cents
      FROM users
      WHERE id=?
    `).get(sourceUserId);

    if(!sourceUser){
      return res.status(404).json({error:'SOURCE_ACCOUNT_NOT_FOUND'});
    }

    if(!beneficiaryName){
      return res.status(400).json({error:'BENEFICIARY_NAME_REQUIRED'});
    }

    if(!beneficiaryCountry){
      return res.status(400).json({error:'BENEFICIARY_COUNTRY_REQUIRED'});
    }

    if(!bankName){
      return res.status(400).json({error:'BANK_NAME_REQUIRED'});
    }

    if(!accountNo && !iban){
      return res.status(400).json({error:'ACCOUNT_OR_IBAN_REQUIRED'});
    }

    if(!bic){
      return res.status(400).json({error:'BIC_REQUIRED'});
    }

    if(!Number.isFinite(amountCents) || amountCents<=0){
      return res.status(400).json({error:'INVALID_AMOUNT'});
    }

    const now=new Date().toISOString();

    const result=db.prepare(`
      INSERT INTO external_transfers(
        source_type,
        source_user_id,
        source_admin_id,
        beneficiary_name,
        beneficiary_country,
        bank_name,
        account_no,
        iban,
        bic,
        amount_cents,
        currency,
        reason,
        beneficiary_email,
        beneficiary_phone,
        notification_method,
        notification_language,
        bank_origin_country,
        bank_origin_address,
        status,
        condition_text,
        condition_completed,
        provider,
        provider_transfer_id,
        provider_status,
        created_at,
        updated_at
      )
      VALUES(
        'admin',
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
        'pending_verification',
        ?,
        0,
        '',
        '',
        '',
        ?,
        ?
      )
    `).run(
      sourceUserId,
      adminId,
      beneficiaryName,
      beneficiaryCountry,
      bankName,
      accountNo,
      iban,
      bic,
      amountCents,
      currency,
      reason,
      beneficiaryEmail,
      beneficiaryPhone,
      notificationMethod,
      notificationLanguage,
      bankOrigin.country,
      bankOrigin.address,
      conditionText,
      now,
      now
    );

    res.json({
      ok:true,
      transferId:result.lastInsertRowid,
      status:'pending_verification',
      sourceAccount:{
        id:sourceUser.id,
        name:sourceUser.name
      }
    });

  }catch(error){

    console.error('Erreur création virement externe admin:',error);

    res.status(500).json({
      error:'ADMIN_EXTERNAL_TRANSFER_CREATE_FAILED'
    });

  }
});


app.patch('/api/admin/external-transfers/:id/status',adminAuth,(req,res)=>{
  try{

    const transferId=Number(req.params.id);
    const nextStatus=String(req.body.status||'').trim().toLowerCase();
    const provider=String(req.body.provider||'').trim();
    const providerTransferId=String(req.body.providerTransferId||'').trim();
    const providerStatus=String(req.body.providerStatus||'').trim();

    if(!Number.isInteger(transferId) || transferId<=0){
      return res.status(400).json({
        error:'INVALID_TRANSFER_ID'
      });
    }

    if(!['verified','processing','completed','failed'].includes(nextStatus)){
      return res.status(400).json({
        error:'INVALID_EXTERNAL_TRANSFER_STATUS'
      });
    }

    const transfer=db.prepare(`
      SELECT *
      FROM external_transfers
      WHERE id=?
    `).get(transferId);

    if(!transfer){
      return res.status(404).json({
        error:'EXTERNAL_TRANSFER_NOT_FOUND'
      });
    }

    const currentStatus=String(transfer.status||'');

    const allowed={
      pending_verification:['verified','failed'],
      verified:['processing','failed'],
      processing:['completed','failed'],
      completed:[],
      failed:[]
    };

    if(!allowed[currentStatus] ||
       !allowed[currentStatus].includes(nextStatus)){
      return res.status(409).json({
        error:'INVALID_STATUS_TRANSITION',
        currentStatus,
        nextStatus
      });
    }

    const nowValue=now();

    const processTransfer=db.transaction(()=>{

      if(nextStatus==='verified'){

        db.prepare(`
          UPDATE external_transfers
          SET status='verified',
              condition_completed=1,
              provider=?,
              provider_transfer_id=?,
              provider_status=?,
              updated_at=?
          WHERE id=?
            AND status='pending_verification'
        `).run(
          provider,
          providerTransferId,
          providerStatus,
          nowValue,
          transferId
        );

      }else if(nextStatus==='processing'){

        const sourceUser=db.prepare(`
          SELECT id,name,balance_cents
          FROM users
          WHERE id=?
        `).get(transfer.source_user_id);

        if(!sourceUser){
          const error=new Error('SOURCE_ACCOUNT_NOT_FOUND');
          error.code='SOURCE_ACCOUNT_NOT_FOUND';
          throw error;
        }

        if(sourceUser.balance_cents < transfer.amount_cents){
          const error=new Error('INSUFFICIENT_BALANCE');
          error.code='INSUFFICIENT_BALANCE';
          throw error;
        }

        const newBalance=
          sourceUser.balance_cents-transfer.amount_cents;

        db.prepare(`
          UPDATE users
          SET balance_cents=?
          WHERE id=?
        `).run(
          newBalance,
          sourceUser.id
        );

        db.prepare(`
          INSERT INTO transactions(
            user_id,
            kind,
            label,
            amount_cents,
            balance_after_cents,
            created_at
          )
          VALUES(?,?,?,?,?,?)
        `).run(
          sourceUser.id,
          'debit',
          'Virement bancaire externe #'+transfer.id,
          -transfer.amount_cents,
          newBalance,
          nowValue
        );

        const processingUpdate=db.prepare(`
          UPDATE external_transfers
          SET status='processing',
              provider=?,
              provider_transfer_id=?,
              provider_status=?,
              updated_at=?
          WHERE id=?
            AND status='verified'
        `).run(
          provider,
          providerTransferId,
          providerStatus,
          nowValue,
          transferId
        );

        if(processingUpdate.changes!==1){
          const error=new Error('EXTERNAL_TRANSFER_STATUS_CHANGED');
          error.code='EXTERNAL_TRANSFER_STATUS_CHANGED';
          throw error;
        }

      }else if(nextStatus==='completed'){

     const completedUpdate=db.prepare(`
  UPDATE external_transfers
  SET status='completed',
      provider=?,
      provider_transfer_id=?,
      provider_status=?,
      completed_at=?,
      updated_at=?
  WHERE id=?
    AND status='processing'
`).run(
  provider,
  providerTransferId,
  providerStatus || 'completed',
  nowValue,
  nowValue,
  transferId
);

if(completedUpdate.changes!==1){
  const error=new Error('EXTERNAL_TRANSFER_STATUS_CHANGED');
  error.code='EXTERNAL_TRANSFER_STATUS_CHANGED';
  throw error;
}   
      }else if(nextStatus==='failed'){

        if(currentStatus==='processing'){

          const sourceUser=db.prepare(`
            SELECT id,name,balance_cents
            FROM users
            WHERE id=?
          `).get(transfer.source_user_id);

          if(!sourceUser){
            const error=new Error('SOURCE_ACCOUNT_NOT_FOUND');
            error.code='SOURCE_ACCOUNT_NOT_FOUND';
            throw error;
          }

          const newBalance=
            sourceUser.balance_cents+transfer.amount_cents;

          db.prepare(`
            UPDATE users
            SET balance_cents=?
            WHERE id=?
          `).run(
            newBalance,
            sourceUser.id
          );

          db.prepare(`
            INSERT INTO transactions(
              user_id,
              kind,
              label,
              amount_cents,
              balance_after_cents,
              created_at
            )
            VALUES(?,?,?,?,?,?)
          `).run(
            sourceUser.id,
            'credit',
            'Remboursement virement externe #'+transfer.id,
            transfer.amount_cents,
            newBalance,
            nowValue
          );

        }

        const failedUpdate=db.prepare(`
          UPDATE external_transfers
          SET status='failed',
              provider=?,
              provider_transfer_id=?,
              provider_status=?,
              updated_at=?
          WHERE id=?
            AND status=?
        `).run(
          provider,
          providerTransferId,
          providerStatus || 'failed',
          nowValue,
          transferId,
          currentStatus
        );

        if(failedUpdate.changes!==1){
          const error=new Error('EXTERNAL_TRANSFER_STATUS_CHANGED');
          error.code='EXTERNAL_TRANSFER_STATUS_CHANGED';
          throw error;
        }

      }

    });

    processTransfer();

    const updated=db.prepare(`
      SELECT *
      FROM external_transfers
      WHERE id=?
    `).get(transferId);

    res.json({
      ok:true,
      transfer:updated
    });

  }catch(error){

    console.error(
      'Erreur traitement virement externe:',
      error
    );

    if(error.code==='SOURCE_ACCOUNT_NOT_FOUND'){
      return res.status(404).json({
        error:'SOURCE_ACCOUNT_NOT_FOUND'
      });
    }

    if(error.code==='INSUFFICIENT_BALANCE'){
      return res.status(400).json({
        error:'INSUFFICIENT_BALANCE'
      });
    }

    if(error.code==='EXTERNAL_TRANSFER_STATUS_CHANGED'){
      return res.status(409).json({
        error:'EXTERNAL_TRANSFER_STATUS_CHANGED'
      });
    }

    res.status(500).json({
      error:'EXTERNAL_TRANSFER_STATUS_UPDATE_FAILED'
    });

  }
});

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
    SELECT id,name,email,notification_language
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
if(user.email){

  sendTransactionEmail({

    to:user.email,

    name:user.name,

    subject:'Nouveau virement entrant en attente de validation',

    title:'🔒 Virement entrant',
        showBalance:false,


    message:
      'Un virement entrant de ' +
      senderName +
      ' d’un montant de ' +
      (amountCents / 100).toFixed(2) +
      ' USD a été enregistré sur votre compte. ' +
      'Les fonds sont actuellement en attente du justificatif demandé et de la validation. ' +
      '<br><br><strong>Justificatif demandé :</strong> ' +
      conditionText,

    amountCents:amountCents,

    balanceCents:(
      db.prepare(
        'SELECT balance_cents FROM users WHERE id=?'
      ).get(userId).balance_cents
    ),
language:user.notification_language || 'fr'
  });

}
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

    const client=db.prepare(`
  SELECT name,email,notification_language
  FROM users
  WHERE id=?
`).get(incoming.user_id);

    if(client && client.email){

      sendTransactionEmail({

        to:client.email,

        name:client.name,

        subject:'Virement entrant validé — fonds disponibles',

        title:'Virement entrant validé',

        message:
          'Le virement entrant de ' +
          incoming.sender_name +
          ' d’un montant de ' +
          (incoming.amount_cents / 100).toFixed(2) +
          ' USD a été validé. ' +
          'Les fonds sont maintenant disponibles sur votre compte.',

        amountCents:incoming.amount_cents,

        balanceCents:result,

language:client.notification_language || 'fr'


      });

    }

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


app.post('/api/admin/send-email',adminAuth,async (req,res)=>{
  try{
    if(!resend){
      return res.status(503).json({
        error:'EMAIL_SERVICE_NOT_CONFIGURED'
      });
    }

    const from=String(req.body.from||'').trim() || 'service@bid-developpement.com';
    const to=String(req.body.to||'').trim();
    const subject=String(req.body.subject||'').trim();
    const message=String(req.body.message||'').trim();

    if(!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)){
      return res.status(400).json({
        error:'INVALID_EMAIL'
      });
    }

    if(!subject){
      return res.status(400).json({
        error:'SUBJECT_REQUIRED'
      });
    }

    if(!message){
      return res.status(400).json({
        error:'MESSAGE_REQUIRED'
      });
    }

    const result=await resend.emails.send({
      from:`Banque Islamique de Développement <${from}>`,
      to:[to],
      subject:subject,
      text:message
    });

    if(result.error){
      console.error('Resend email error:',result.error);

      return res.status(502).json({
        error:'EMAIL_SEND_FAILED'
      });
    }

    res.json({
      ok:true,
      id:result.data?.id||null
    });

  }catch(e){
    console.error('External email error:',e);

    res.status(500).json({
      error:'EMAIL_SEND_FAILED'
    });
  }
});

app.get('/IMG_4145.jpeg',(req,res)=>{
  res.sendFile(path.join(__dirname,'IMG_4145.jpeg'));
});


app.get('/verification/:orderNumber',(req,res)=>{
  try{

    const orderNumber=String(req.params.orderNumber||'').trim().toUpperCase();

    const match=orderNumber.match(/^OV-(\d{8})$/);

    if(!match){
      return res.status(404).send(`
        <!doctype html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Vérification de l'ordre</title>
          <style>
            body{
              margin:0;
              font-family:Arial,sans-serif;
              background:#f3f7f5;
              color:#222;
            }
            .card{
              max-width:760px;
              margin:50px auto;
              background:white;
              padding:30px;
              border-radius:16px;
              box-shadow:0 8px 30px rgba(0,0,0,.08);
            }
            h1{
              color:#073d34;
              margin-top:0;
            }
            .simulation{
              color:#087f68;
              font-weight:700;
              margin-bottom:25px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Ordre introuvable</h1>
            <div class="simulation">DOCUMENT DE SIMULATION</div>
            <p>Le numéro d'ordre fourni n'est pas valide.</p>
          </div>
        </body>
        </html>
      `);
    }

    const transferId=Number(match[1]);

    const transfer=db.prepare(`
      SELECT
        et.*,
        u.name AS source_user_name,
        u.email AS source_user_email,
        u.iban AS source_user_iban
      FROM external_transfers et
      LEFT JOIN users u
        ON u.id=et.source_user_id
      WHERE et.id=?
    `).get(transferId);

    if(!transfer){
      return res.status(404).send(`
        <!doctype html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Ordre introuvable</title>
          <style>
            body{
              margin:0;
              font-family:Arial,sans-serif;
              background:#f3f7f5;
              color:#222;
            }
            .card{
              max-width:760px;
              margin:50px auto;
              background:white;
              padding:30px;
              border-radius:16px;
              box-shadow:0 8px 30px rgba(0,0,0,.08);
            }
            h1{
              color:#073d34;
              margin-top:0;
            }
            .simulation{
              color:#087f68;
              font-weight:700;
              margin-bottom:25px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Ordre introuvable</h1>
            <div class="simulation">DOCUMENT DE SIMULATION</div>
            <p>Aucun ordre ne correspond à ce numéro.</p>
          </div>
        </body>
        </html>
      `);
    }

    const orderNumberDisplay=
      'OV-'+String(transfer.id).padStart(8,'0');

    const createdAt=
      transfer.created_at
        ? new Date(transfer.created_at).toLocaleString('fr-FR')
        : '—';

    const amount=
      (Number(transfer.amount_cents||0)/100)
        .toLocaleString('fr-FR',{
          minimumFractionDigits:2,
          maximumFractionDigits:2
        })+
      ' '+
      (transfer.currency||'USD');

    const sourceName=
      transfer.source_user_name ||
      transfer.source_user_email ||
      '—';

    const sourceIban=
      transfer.source_user_iban ||
      '—';

    const notification=
      transfer.notification_method === 'sms'
        ? 'SMS'
        : 'Email';

    const esc=value=>String(value??'—')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');

    res.send(`
      <!doctype html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">

        <title>${esc(orderNumberDisplay)} — Vérification</title>

        <style>
          *{
            box-sizing:border-box;
          }

          body{
            margin:0;
            font-family:Arial,sans-serif;
            background:#f3f7f5;
            color:#222;
          }

          .card{
            max-width:850px;
            margin:35px auto;
            background:#fff;
            padding:32px;
            border-radius:18px;
            box-shadow:0 8px 30px rgba(0,0,0,.08);
          }

          .header{
            text-align:center;
            border-bottom:1px solid #dce8e4;
            padding-bottom:22px;
            margin-bottom:25px;
          }

          .header img{
            width:110px;
            max-height:75px;
            object-fit:contain;
            margin-bottom:10px;
          }

          h1{
            color:#073d34;
            margin:5px 0;
            font-size:27px;
          }

          h2{
            color:#073d34;
            font-size:18px;
            margin:25px 0 10px;
            padding-bottom:7px;
            border-bottom:2px solid #087f68;
          }

          .simulation{
            color:#087f68;
            font-weight:700;
            font-size:14px;
            margin-top:8px;
          }

          .order{
            text-align:center;
            font-weight:700;
            margin:15px 0;
          }

          .grid{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:12px 25px;
          }

          .field{
            padding:8px 0;
          }

          .label{
            font-size:12px;
            color:#687873;
            margin-bottom:3px;
          }

          .value{
            font-size:15px;
            font-weight:600;
            word-break:break-word;
          }

          .notice{
            margin-top:28px;
            padding:15px;
            border-radius:10px;
            background:#eef7f3;
            color:#073d34;
            text-align:center;
            font-weight:700;
          }

          @media(max-width:650px){
            .card{
              margin:15px;
              padding:22px;
            }

            .grid{
              grid-template-columns:1fr;
            }
          }
        </style>
      </head>

      <body>

        <div class="card">

          <div class="header">
            <img
              src="/IMG_4145.jpeg"
              alt="Banque Islamique de Développement"
            >

            <h1>Banque Islamique de Développement</h1>

            <div>ORDRE DE VIREMENT</div>

            <div class="simulation">
              DOCUMENT DE SIMULATION
            </div>
          </div>

          <div class="order">
            Numéro de l'ordre :
            ${esc(orderNumberDisplay)}
          </div>

          <h2>Informations générales</h2>

          <div class="grid">

            <div class="field">
              <div class="label">Date</div>
              <div class="value">${esc(createdAt)}</div>
            </div>

            <div class="field">
              <div class="label">Statut</div>
              <div class="value">${esc(transfer.status)}</div>
            </div>

          </div>

          <h2>Banque émettrice</h2>

          <div class="grid">

            <div class="field">
              <div class="label">Banque</div>
              <div class="value">
                Banque Islamique de Développement
              </div>
            </div>

            <div class="field">
              <div class="label">Pays / implantation</div>
              <div class="value">
                ${esc(transfer.bank_origin_country)}
              </div>
            </div>

            <div class="field">
              <div class="label">Adresse</div>
              <div class="value">
                ${esc(transfer.bank_origin_address)}
              </div>
            </div>

          </div>

          <h2>Donneur d'ordre</h2>

          <div class="grid">

            <div class="field">
              <div class="label">Nom</div>
              <div class="value">${esc(sourceName)}</div>
            </div>

            <div class="field">
              <div class="label">Compte / IBAN</div>
              <div class="value">${esc(sourceIban)}</div>
            </div>

          </div>

          <h2>Bénéficiaire</h2>

          <div class="grid">

            <div class="field">
              <div class="label">Nom</div>
              <div class="value">
                ${esc(transfer.beneficiary_name)}
              </div>
            </div>

            <div class="field">
              <div class="label">Pays</div>
              <div class="value">
                ${esc(transfer.beneficiary_country)}
              </div>
            </div>

          </div>

          <h2>Banque bénéficiaire</h2>

          <div class="grid">

            <div class="field">
              <div class="label">Banque</div>
              <div class="value">
                ${esc(transfer.bank_name)}
              </div>
            </div>

            <div class="field">
              <div class="label">Compte / IBAN</div>
              <div class="value">
                ${esc(transfer.iban || transfer.account_no)}
              </div>
            </div>

            <div class="field">
              <div class="label">BIC / SWIFT</div>
              <div class="value">
                ${esc(transfer.bic)}
              </div>
            </div>

          </div>

          <h2>Détails du virement</h2>

          <div class="grid">

            <div class="field">
              <div class="label">Montant</div>
              <div class="value">${esc(amount)}</div>
            </div>

            <div class="field">
              <div class="label">Notification</div>
              <div class="value">${esc(notification)}</div>
            </div>

            <div class="field">
              <div class="label">Motif</div>
              <div class="value">
                ${esc(transfer.reason)}
              </div>
            </div>

            <div class="field">
              <div class="label">Condition du virement</div>
              <div class="value">
                ${esc(transfer.condition_text)}
              </div>
            </div>

          </div>

          <div class="notice">
            DOCUMENT DE SIMULATION
          </div>

        </div>

      </body>
      </html>
    `);

  }catch(error){

    console.error(
      'Erreur vérification ordre:',
      error
    );

    res.status(500).send(
      'Erreur lors de la vérification de l’ordre.'
    );

  }
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

app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname,'home.html'));
});

app.get('*',(req,res)=>{
  res.sendFile(path.join(__dirname,'index.html'));
});

const port=process.env.PORT||3000;

app.listen(port,()=>{
  console.log(`Banque Islamique de Développement listening on port ${port}`);
});
