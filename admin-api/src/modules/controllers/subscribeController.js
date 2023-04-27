const nodemailer = require("nodemailer");

exports.default = async (req, res) => {
  const errors = [];
  if (!req.body.name) errors.push('"name" field is required');
  if (!req.body.email) errors.push('"email" field is required');
  const message = `Name: ${req.body.name}, email: ${req.body.email}`;
  const htmlMessage = `<p><b>Name</b>: ${req.body.name}</p><p><b>Email</b>: ${req.body.email}</p>`;
  if (errors.length) {
    return res.send({success: false, errors});
  }
  const transporter = nodemailer.createTransport({
    pool: true,
    host: "smtp-relay.gmail.com",
    port: 465,
    secure: true, // use TLS
    auth: {
      user: "sergei@0xpad.io",
      pass: "zkxbrauzqkwencnw",
    },
  });
  const result = await transporter.sendMail({
    from: "sergei@0xpad.io",
    to: "subscribe@0xpad.io",
    subject: "Subscribe request from 0xpad.io",
    text: message,
    html: htmlMessage,
    sender: "",
    replyTo: ""
  });
  return res.send({success: true});
};