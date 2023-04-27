const nodemailer = require("nodemailer");

(async () => {
  const addresses = [
    'serg.paliy@gmail.com',
  ];
  const subject = 'Test subject';
  const message = `Test`;
  const htmlMessage = `
    <p>Test</p>
  `;

  const transporter = nodemailer.createTransport({
    pool: true,
    host: "smtp-relay.gmail.com",
    port: 465,
    secure: true, // use TLS
    auth: {
      user: "subscribe@0xpad.io",
      pass: "uF%gb)k7%f",
    },
  });
  for (let i = 0; i < addresses.length; i ++) {
    const result = await transporter.sendMail({
      from: "subscribe@0xpad.io",
      to: addresses[i],
      subject: "Subscribe request from 0xpad.io",
      text: message,
      html: htmlMessage,
      sender: "",
      replyTo: ""
    });
    if (!result) console.log(`Sending to address ${addresses[i]}`);
  }
})()
  .catch();