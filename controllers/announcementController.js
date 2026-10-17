const Announcement = require('../models/Announcement');
const { logActivity } = require('../utils/activity');

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'h3', 'h4', 'blockquote', 'div'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const escapeAngles = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Làm sạch HTML từ trình soạn thảo: chỉ giữ lại thẻ định dạng cơ bản, bỏ toàn bộ thuộc tính,
// và escape mọi ký tự "<" / ">" còn sót lại để không thể tạo thẻ ngoài ý muốn.
function sanitizeHtml(input) {
  const html = String(input || '')
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const tagRe = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let out = '';
  let last = 0;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    out += escapeAngles(html.slice(last, m.index));
    const tag = m[1].toLowerCase();
    if (ALLOWED_TAGS.includes(tag)) {
      out += m[0].startsWith('</') ? `</${tag}>` : tag === 'br' ? '<br>' : `<${tag}>`;
    }
    last = m.index + m[0].length;
  }
  out += escapeAngles(html.slice(last));
  return out;
}

const textLength = (html) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length;

// GET /api/announcements?search=&category=&status=
exports.list = async (req, res) => {
  const q = {};
  const search = str(req.query.search);
  if (search) q.title = new RegExp(escapeRegex(search), 'i');
  if (['general', 'academic', 'event', 'urgent'].includes(req.query.category)) q.category = req.query.category;
  if (['published', 'draft'].includes(req.query.status)) q.status = req.query.status;

  const announcements = await Announcement.find(q).sort({ pinned: -1, createdAt: -1 }).limit(500).lean();
  res.json({ announcements });
};

// POST /api/announcements
exports.create = async (req, res) => {
  const b = req.body || {};
  const content = sanitizeHtml(b.content);
  if (textLength(content) < 10) return res.status(400).json({ message: 'Nội dung bài viết tối thiểu 10 ký tự' });

  const announcement = await Announcement.create({
    title: str(b.title),
    content,
    category: b.category,
    pinned: b.pinned === true,
    status: b.status === 'draft' ? 'draft' : 'published',
    author: req.user._id,
    authorName: req.user.name,
  });

  await logActivity(
    'announcement',
    `Đã ${announcement.status === 'draft' ? 'lưu nháp' : 'đăng'} bài viết "${announcement.title}"`,
    req.user
  );
  res.status(201).json({ message: 'Đã đăng bài viết', announcement });
};

// PUT /api/announcements/:id
exports.update = async (req, res) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

  const b = req.body || {};
  const content = sanitizeHtml(b.content);
  if (textLength(content) < 10) return res.status(400).json({ message: 'Nội dung bài viết tối thiểu 10 ký tự' });

  a.title = str(b.title);
  a.content = content;
  if (b.category) a.category = b.category;
  a.pinned = b.pinned === true;
  a.status = b.status === 'draft' ? 'draft' : 'published';
  await a.save();

  await logActivity('announcement', `Đã cập nhật bài viết "${a.title}"`, req.user);
  res.json({ message: 'Đã cập nhật bài viết', announcement: a });
};

// PATCH /api/announcements/:id/pin
exports.togglePin = async (req, res) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
  a.pinned = !a.pinned;
  await a.save();
  await logActivity('announcement', `Đã ${a.pinned ? 'ghim' : 'bỏ ghim'} bài viết "${a.title}"`, req.user);
  res.json({ message: a.pinned ? 'Đã ghim bài viết' : 'Đã bỏ ghim', announcement: a });
};

// DELETE /api/announcements/:id
exports.remove = async (req, res) => {
  const a = await Announcement.findByIdAndDelete(req.params.id);
  if (!a) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
  await logActivity('announcement', `Đã xóa bài viết "${a.title}"`, req.user);
  res.json({ message: 'Đã xóa bài viết' });
};

exports.sanitizeHtml = sanitizeHtml;
