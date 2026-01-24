export const emailTemplate = (emailContent) => `
<!DOCTYPE html>
  <html>
    <head>
        <style>
        </style>
    </head>
    <body>
    <div style="width: 100%; padding: 8px; background-color: #6A0136; color: white; text-align: center; font-size: 30px;">
      &#xFDFD;
    </div>
      <div style="width: 100%; background-color: #F2EBEE; padding: 8px; text-align: center">
        <img src="https://classroom.waqfenau.us/assets/app-logomark.png" style="border:none; mix-blend-mode:multiply; width: 300px;" >
      </div>
      <div style="box-shadow: 0px 4px 15px rgba(0,0,0,0.1);margin: 16px; border-radius: 8px; padding: 20px">
        ${emailContent}
      </div>
      <div style="margin: 16px; padding: 8px; text-align: center">
        <div style="color: #000000EE"><em>This is an auto-generated message sent to an email address registered with <a href="https://classroom.waqfenau.us">Waqf-e-Nau USA Classes Portal</a>. If you are not the intended recepient, please notify our team by sending an email to <a href="mailto:waqfenau.classes@ahmadiyya.us">waqfenau.classes@ahmadiyya.us</a></em></div>
        <div style="margin-top: 16px"><img src="https://classroom.waqfenau.us/assets/wn-logomark-blue.png" width="300px"></div>
      </div>
    </body>
  </html>
`;
