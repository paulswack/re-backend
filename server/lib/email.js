const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'RE Back Office <notifications@eliteregbackoffice.com>';

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log('Email not configured (no RESEND_API_KEY). Would send to:', to, 'Subject:', subject);
    return null;
  }
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    });
    return result;
  } catch (err) {
    console.error('Email send error:', err);
    return null;
  }
}

// Pre-built email templates
function welcomeEmail(displayName, teamName) {
  return {
    subject: 'Welcome to RE Back Office!',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#002242;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:14px;">RE Back Office</div>
        </div>
        <h2 style="color:#1E293B;font-size:20px;margin-bottom:8px;">Welcome, ${displayName}!</h2>
        <p style="color:#64748B;font-size:15px;line-height:1.6;">Your team <strong>${teamName}</strong> is all set up. You can now start tracking listings, managing escrows, and growing your business.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="https://app.eliteregbackoffice.com/dashboard.html" style="display:inline-block;background:#002242;color:#fff;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Go to Dashboard</a>
        </div>
        <p style="color:#94A3B8;font-size:13px;text-align:center;">Questions? Reply to this email and we'll help you out.</p>
      </div>
    `
  };
}

function passwordResetEmail(displayName, newPassword) {
  return {
    subject: 'Your password has been reset — RE Back Office',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#002242;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:14px;">RE Back Office</div>
        </div>
        <h2 style="color:#1E293B;font-size:20px;margin-bottom:8px;">Password Reset</h2>
        <p style="color:#64748B;font-size:15px;line-height:1.6;">Hi ${displayName}, your password has been reset by your Team Lead.</p>
        <p style="color:#64748B;font-size:15px;line-height:1.6;">Your temporary password is: <strong style="color:#1E293B;background:#F1F5F9;padding:4px 12px;border-radius:6px;font-family:monospace;">${newPassword}</strong></p>
        <p style="color:#64748B;font-size:15px;line-height:1.6;">Please log in and change it from your Profile page.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="https://app.eliteregbackoffice.com/login.html" style="display:inline-block;background:#002242;color:#fff;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Sign In</a>
        </div>
      </div>
    `
  };
}

function dealUpdateEmail(clientName, address, updateTitle, updateDetail) {
  return {
    subject: `Update on ${address} — ${updateTitle}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#002242;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:14px;">RE Back Office</div>
        </div>
        <h2 style="color:#1E293B;font-size:20px;margin-bottom:8px;">${updateTitle}</h2>
        <p style="color:#64748B;font-size:15px;line-height:1.6;">Hi ${clientName},</p>
        <p style="color:#64748B;font-size:15px;line-height:1.6;">Here's an update on <strong>${address}</strong>:</p>
        <div style="background:#F8FAFC;border-radius:10px;padding:16px 20px;margin:16px 0;border-left:4px solid #002242;">
          <p style="color:#1E293B;font-size:15px;font-weight:600;margin:0 0 4px;">${updateTitle}</p>
          <p style="color:#64748B;font-size:14px;margin:0;">${updateDetail || ''}</p>
        </div>
        <p style="color:#94A3B8;font-size:13px;text-align:center;margin-top:28px;">This is an automated update from RE Back Office.</p>
      </div>
    `
  };
}

function reviewRequestEmail(clientName, agentName, reviewUrl, address) {
  return {
    subject: `${agentName} would love your review!`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#002242;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:14px;">RE Back Office</div>
        </div>
        <h2 style="color:#1E293B;font-size:20px;margin-bottom:8px;">How was your experience?</h2>
        <p style="color:#64748B;font-size:15px;line-height:1.6;">Hi ${clientName},</p>
        <p style="color:#64748B;font-size:15px;line-height:1.6;">Congratulations on ${address ? 'closing on <strong>' + address + '</strong>' : 'your recent transaction'}! ${agentName} would really appreciate a quick review.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${reviewUrl}" style="display:inline-block;background:#002242;color:#fff;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Leave a Review</a>
        </div>
        <p style="color:#94A3B8;font-size:13px;text-align:center;">It only takes a minute and means the world. Thank you!</p>
      </div>
    `
  };
}

function deadlineReminderEmail(agentName, deadlines) {
  var rows = deadlines.map(function(d) {
    var urgency = d.diff < 0 ? '#DC2626' : d.diff <= 3 ? '#D97706' : '#6366F1';
    var dueLabel = d.diff < 0
      ? Math.abs(d.diff) + ' day' + (Math.abs(d.diff) === 1 ? '' : 's') + ' OVERDUE'
      : d.diff === 0 ? 'DUE TODAY'
      : d.diff === 1 ? 'Due Tomorrow'
      : 'Due in ' + d.diff + ' days';
    return `
      <div style="padding:14px 20px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;gap:16px">
        <div style="width:4px;min-height:40px;border-radius:2px;background:${urgency};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:#1E293B">${d.label}</div>
          <div style="font-size:12px;color:#64748B;margin-top:2px">${d.address}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:12px;font-weight:700;color:${urgency};white-space:nowrap">${dueLabel}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:2px">${d.date}</div>
        </div>
      </div>`;
  }).join('');

  return {
    subject: deadlines.length === 1
      ? `Deadline Reminder: ${deadlines[0].label} — ${deadlines[0].address}`
      : `${deadlines.length} Upcoming Deadlines — RE Back Office`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#002242;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:14px;">RE Back Office</div>
        </div>
        <h2 style="color:#1E293B;font-size:20px;margin-bottom:6px;">Deadline Reminder</h2>
        <p style="color:#64748B;font-size:15px;line-height:1.6;margin-bottom:20px;">Hi ${agentName}, here are your upcoming deadlines that need attention:</p>
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
          ${rows}
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://app.eliteregbackoffice.com/transactions.html" style="display:inline-block;background:#002242;color:#fff;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">View Escrows</a>
        </div>
        <p style="color:#94A3B8;font-size:12px;text-align:center;">You're receiving this because you have deadlines enabled on your escrows in RE Back Office.</p>
      </div>
    `
  };
}

module.exports = { sendEmail, welcomeEmail, passwordResetEmail, dealUpdateEmail, reviewRequestEmail, deadlineReminderEmail };
