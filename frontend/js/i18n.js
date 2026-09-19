/* ============================================================
   i18n.js
   Minimal translation layer — a flat key → string lookup, no
   framework. tr("some_key") returns the string in the current
   language (falls back to English, then to the key itself).

   Scope (for now): login page, header, coach's ticket list, the
   quick-create form. Admin-only panels (Students/Branches/Import/
   Accounts/Stats/Reject/Note) aren't wired up yet — they'll still
   show English until that's done.

   Field VALUES stored in the database (e.g. details.type === "FOC")
   are never translated — only what's displayed. See dynamicFields()
   in views.js for how <option value="…"> keeps the English value
   while showing a translated label.
============================================================ */

const STRINGS = {
  en: {
    // ---- login ----
    login_subtitle: "Sign in to continue",
    login_email: "Email",
    login_email_placeholder: "you@example.com",
    login_password: "Password",
    login_signin: "Sign in",
    login_signingin: "Signing in…",
    login_footer: "Accounts are created by your administrator",

    // ---- header ----
    role_admin: "Admin",
    role_coach: "Coach",
    nav_students: "Students",
    nav_import: "Import",
    nav_branches: "Branches",
    nav_accounts: "Accounts",
    nav_categories: "Categories",
    nav_new_ticket: "New ticket",
    nav_signout: "Sign out",
    nav_toggle_theme: "Toggle dark mode",
    nav_toggle_lang: "Switch language",

    // ---- coach: ticket list ----
    my_tickets: "My tickets",
    closed: "Closed",
    no_tickets_yet: "No tickets yet — click New ticket to raise one",
    no_tickets_match_search: "No tickets match this search",
    no_closed_match_search: "No closed tickets match this search",
    search_my_tickets_placeholder: "Search your tickets by code or category…",

    // ---- ticket card (shared) ----
    badge_high: "HIGH",
    badge_foc_senior: "FOC · SENIOR",
    badge_note: "Note",
    routed_to: "Routed to",
    aging_prefix: "Aging",

    // ---- ticket detail modal ----
    detail_title: "Ticket detail",
    detail_ticket_code: "Ticket code",
    detail_branch: "Branch",
    detail_department: "Department",
    detail_raised: "Raised",
    detail_request_details: "Request details",
    detail_note_from_admin: "Note from admin",

    btn_edit: "Edit",
    btn_cancel_ticket: "Cancel ticket",
    btn_resubmit: "Resubmit",
    working: "Working…",

    // ---- categories ----
    cat_Equipment_label: "Equipment",
    cat_Equipment_desc: "T-shirt, Racket, Stringing",
    cat_Schedule_label: "Schedule",
    cat_Schedule_desc: "Leave / Makeup class",
    cat_ChangeClass_label: "Change Branch/Time",
    cat_ChangeClass_desc: "Permanent class change",
    cat_Finance_label: "Finance",
    cat_Finance_desc: "Tuition, Receipt",
    cat_SpecialCare_label: "Special Care",
    cat_SpecialCare_desc: "Late pickup, Injury",

    // ---- statuses ----
    status_New: "New",
    status_In_Progress: "In Progress",
    status_Ready: "Ready",
    status_Completed: "Completed",
    status_Rejected: "Rejected",

    // ---- quick-create modal ----
    qc_title_new: "Quick ticket",
    qc_title_edit: "Edit ticket",
    qc_ai_label: "Describe the request — AI fills the form below",
    qc_ai_placeholder: "e.g. Free T-shirt (L) and a skipping rope for Jane Lim",
    qc_ai_fill: "Fill",
    qc_ai_loading: "Thinking… this can take a little while.",
    qc_ai_error: "Couldn't process that — try rephrasing, or fill in manually below.",
    qc_category: "Category",
    qc_remark_label: "Optional — branch",
    qc_no_branch: "No branch",
    qc_route_preview: "Will route to:",
    qc_cancel: "Cancel",
    qc_create: "Create & route",
    qc_creating: "Creating…",
    qc_save: "Save changes",
    qc_saving: "Saving…",

    // ---- equipment multi-item list ----
    eq_added_items: "Items in this request",
    eq_no_items_yet: "No items added yet — pick one below and hit Add.",
    eq_add_item: "Add item",

    // ---- dynamic field labels ----
    fld_item: "Item",
    fld_type: "Type",
    fld_size: "Size",
    fld_quantity: "Quantity",
    fld_requireDate: "Require Date",
    fld_date: "Date",
    fld_reason: "Reason",
    fld_to: "Change to (branch)",
    fld_newClass: "New class",
    fld_amount: "Amount",
    fld_receipt: "Receipt",
    fld_note: "Note",
    fld_reject_reason: "Reject reason",
    fld_select_item: "Select Item…",
    fld_select: "Select…",
    unit_basket: "(Basket)",
    unit_dozen: "(Dozen)",
    receipt_mock_cta: "Click to attach receipt (mock)",
    changeclass_placeholder: "e.g. U12 Advanced",
    specialcare_note_placeholder: "Details for on-duty staff",

    // ---- dynamic field option labels (values stay in English) ----
    opt_Purchase: "Purchase",
    opt_FOC: "FOC",
    opt_Leave: "Leave",
    "opt_Makeup class": "Makeup class",
    "opt_Tuition payment": "Tuition payment",
    "opt_Receipt verification": "Receipt verification",
    "opt_Late pickup": "Late pickup",
    "opt_Injury observation": "Injury observation",
    "opt_Students Tshirt": "Students Tshirt",
    "opt_Skipping rope": "Skipping rope",
    "opt_Students racquet": "Students racquet",
    "opt_Students String & Grip": "Students String & Grip",
    "opt_Coach multishuttle": "Coach multishuttle",
    "opt_Coach game play shuttle": "Coach game play shuttle",
    "opt_Company racquet": "Company racquet",
    "opt_Coach Tshirt": "Coach Tshirt",
  },

  zh: {
    login_subtitle: "登录以继续",
    login_email: "邮箱",
    login_email_placeholder: "you@example.com",
    login_password: "密码",
    login_signin: "登录",
    login_signingin: "登录中…",
    login_footer: "账号由管理员创建",

    role_admin: "管理员",
    role_coach: "教练",
    nav_students: "学生",
    nav_import: "导入",
    nav_branches: "分店",
    nav_accounts: "账号",
    nav_categories: "类别",
    nav_new_ticket: "新建工单",
    nav_signout: "登出",
    nav_toggle_theme: "切换深色模式",
    nav_toggle_lang: "切换语言",

    my_tickets: "我的工单",
    closed: "已关闭",
    no_tickets_yet: "还没有工单——点新建工单来提交一个",
    no_tickets_match_search: "没有符合搜索条件的工单",
    no_closed_match_search: "没有符合搜索条件的已关闭工单",
    search_my_tickets_placeholder: "按票号或分类搜索你的工单…",

    badge_high: "紧急",
    badge_foc_senior: "免费·需高层审批",
    badge_note: "备注",
    routed_to: "已转交",
    aging_prefix: "已等待",

    detail_title: "工单详情",
    detail_ticket_code: "票号",
    detail_branch: "分店",
    detail_department: "部门",
    detail_raised: "建单时间",
    detail_request_details: "请求详情",
    detail_note_from_admin: "管理员备注",

    btn_edit: "编辑",
    btn_cancel_ticket: "取消工单",
    btn_resubmit: "重新提交",
    working: "处理中…",

    cat_Equipment_label: "器材",
    cat_Equipment_desc: "T恤、球拍、穿线",
    cat_Schedule_label: "排班/请假",
    cat_Schedule_desc: "请假 / 补课",
    cat_ChangeClass_label: "换分店/时间",
    cat_ChangeClass_desc: "永久更改班级",
    cat_Finance_label: "财务",
    cat_Finance_desc: "学费、收据",
    cat_SpecialCare_label: "特别关注",
    cat_SpecialCare_desc: "延迟接送、受伤",

    status_New: "新建",
    status_In_Progress: "处理中",
    status_Ready: "已就绪",
    status_Completed: "已完成",
    status_Rejected: "已拒绝",

    qc_title_new: "快速建单",
    qc_title_edit: "编辑工单",
    qc_ai_label: "描述你的需求——AI 会帮你填好下面的表单",
    qc_ai_placeholder: "例如：帮 Jane Lim 申请一件免费T恤（L码）和一条跳绳",
    qc_ai_fill: "填写",
    qc_ai_loading: "思考中…可能要等一下。",
    qc_ai_error: "没能处理这段文字——换个说法试试，或者直接在下面手动填写。",
    qc_category: "分类",
    qc_remark_label: "可选——分店",
    qc_no_branch: "不选分店",
    qc_route_preview: "将转交给：",
    qc_cancel: "取消",
    qc_create: "建单并路由",
    qc_creating: "建单中…",
    qc_save: "保存修改",
    qc_saving: "保存中…",

    eq_added_items: "本次申请的物品",
    eq_no_items_yet: "还没加物品——在下面选好后点「加入」。",
    eq_add_item: "加入物品",

    fld_item: "物品",
    fld_type: "类型",
    fld_size: "尺寸",
    fld_quantity: "数量",
    fld_requireDate: "需要日期",
    fld_date: "日期",
    fld_reason: "原因",
    fld_to: "换去（分店）",
    fld_newClass: "新班级",
    fld_amount: "金额",
    fld_receipt: "收据",
    fld_note: "备注",
    fld_reject_reason: "拒绝原因",
    fld_select_item: "选择物品…",
    fld_select: "请选择…",
    unit_basket: "（篮）",
    unit_dozen: "（打）",
    receipt_mock_cta: "点击附上收据（模拟）",
    changeclass_placeholder: "例如：U12 高级班",
    specialcare_note_placeholder: "给值班人员的详情",

    opt_Purchase: "购买",
    opt_FOC: "免费",
    opt_Leave: "请假",
    "opt_Makeup class": "补课",
    "opt_Tuition payment": "学费缴纳",
    "opt_Receipt verification": "收据核实",
    "opt_Late pickup": "延迟接送",
    "opt_Injury observation": "受伤观察",
    "opt_Students Tshirt": "学生T恤",
    "opt_Skipping rope": "跳绳",
    "opt_Students racquet": "学生球拍",
    "opt_Students String & Grip": "学生穿线&手胶",
    "opt_Coach multishuttle": "教练多球",
    "opt_Coach game play shuttle": "教练比赛用球",
    "opt_Company racquet": "公司球拍",
    "opt_Coach Tshirt": "教练T恤",
  },
};

let LANG = (function () {
  try { return localStorage.getItem("lang") || "en"; } catch (e) { return "en"; }
})();

// named tr(), not t() — views.js overwhelmingly uses "t" as the parameter
// name for "this ticket", which would silently shadow a global t()
function tr(key, vars) {
  let str = STRINGS[LANG]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, v);
  return str;
}

function setLang(lang) {
  LANG = lang;
  try { localStorage.setItem("lang", lang); } catch (e) {}
}

// translates a <select> option's display label while the stored/submitted
// value (v) stays exactly as-is in English — falls back to v itself (not the
// key) when there's no translation entry, so untranslated options still show
// something sensible instead of a raw "opt_Foo" string.
function optLabel(v) {
  return STRINGS[LANG]?.["opt_" + v] ?? STRINGS.en["opt_" + v] ?? v;
}
