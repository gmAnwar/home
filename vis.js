/* VISITAS · anwarsepulveda.com  ·  medición propia, sin cookies de terceros.
   1) registra cada visita   2) pasa la identidad entre dominios propios
   3) estampa vid/origen en lo que ya se manda al webhook, sin tocar el resto del código */
(function () {
  var EP = "https://script.google.com/macros/s/AKfycbzFJQXuO-PKtZ9Y1bofwaDjdMamWwNFoERby6dqbQHiFOV7Z5nqAlfZl9SpRT0icwkK2w/exec";
  var TK = "as-vis-2026";
  var HOOK = "hook.us2.make.com";
  var PAGE = /^diagnostico\./.test(location.hostname) ? "diagnostico"
           : /^go\./.test(location.hostname) ? "ghl" : "home";

  var vid = "", sid = "", first = { s: "", m: "", c: "" }, u = {};

  try {
    var LS = window.localStorage, SS = window.sessionStorage;
    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
    var q = new URLSearchParams(location.search);

    vid = q.get("vid") || LS.getItem("as_vid") || uid();
    LS.setItem("as_vid", vid);
    sid = SS.getItem("as_sid");
    var nueva = 0;
    if (!sid) { sid = uid(); SS.setItem("as_sid", sid); nueva = 1; }

    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      var v = q.get(k); if (v) u[k] = v;
    });

    var ref = "";
    try { if (document.referrer) ref = new URL(document.referrer).hostname.replace(/^www\./, ""); } catch (e) {}

    if (!u.utm_source) {
      var M = { "facebook.com": "facebook", "m.facebook.com": "facebook", "l.facebook.com": "facebook",
                "lm.facebook.com": "facebook", "business.facebook.com": "facebook",
                "instagram.com": "instagram", "l.instagram.com": "instagram",
                "linkedin.com": "linkedin", "lnkd.in": "linkedin", "t.co": "twitter",
                "google.com": "google", "google.com.mx": "google", "bing.com": "bing",
                "duckduckgo.com": "duckduckgo", "youtube.com": "youtube", "m.youtube.com": "youtube",
                "chatgpt.com": "chatgpt", "claude.ai": "claude", "perplexity.ai": "perplexity",
                "wa.me": "whatsapp", "api.whatsapp.com": "whatsapp", "mail.google.com": "email" };
      if (ref && ref.indexOf("anwarsepulveda.com") === -1) { u.utm_source = M[ref] || ref; u.utm_medium = "referido"; }
      else if (!ref) { u.utm_source = "directo"; u.utm_medium = "directo"; }
      else { u.utm_source = "interno"; u.utm_medium = "interno"; }
    }

    try { first = JSON.parse(LS.getItem("as_first") || "null") || first; } catch (e) {}
    if (!first.s && u.utm_source && u.utm_source !== "interno") {
      first = { s: u.utm_source, m: u.utm_medium || "", c: u.utm_campaign || "" };
      LS.setItem("as_first", JSON.stringify(first));
    }

    window.ASV = { vid: vid, sid: sid, first: first, utm: u };

    var d = { tk: TK, pagina: PAGE, path: location.pathname, vid: vid, sid: sid, nueva: nueva,
      utm_source: u.utm_source || "", utm_medium: u.utm_medium || "", utm_campaign: u.utm_campaign || "",
      utm_content: u.utm_content || "", utm_term: u.utm_term || "",
      first_source: first.s, first_medium: first.m, first_campaign: first.c,
      ref: ref, fbclid: q.get("fbclid") ? 1 : 0,
      disp: (window.matchMedia && matchMedia("(max-width:768px)").matches ? "movil" : "escritorio"),
      pantalla: innerWidth + "x" + innerHeight, idioma: navigator.language || "" };

    var body = new Blob([JSON.stringify(d)], { type: "text/plain;charset=UTF-8" });
    if (navigator.sendBeacon) navigator.sendBeacon(EP, body);
    else fetch(EP, { method: "POST", mode: "no-cors", body: JSON.stringify(d) });

    /* la identidad viaja al otro dominio propio (home <-> diagnostico <-> go/GHL) */
    document.addEventListener("click", function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!a) return;
      var url; try { url = new URL(a.href, location.href); } catch (e) { return; }
      if (url.hostname === location.hostname) return;
      if (!/(^|\.)anwarsepulveda\.com$/.test(url.hostname)) return;
      if (url.searchParams.get("vid")) return;
      url.searchParams.set("vid", vid);
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
        if (u[k] && !url.searchParams.get(k)) url.searchParams.set(k, u[k]);
      });
      a.href = url.toString();
    }, true);
  } catch (e) {}

  /* estampa el origen en lo que la página ya manda al webhook (no reemplaza nada) */
  try {
    var _f = window.fetch;
    function enrich(b) {
      try {
        var o = JSON.parse(b);
        if (o && typeof o === "object" && !Array.isArray(o)) {
          if (!o.vid) o.vid = vid;
          if (!o.sid) o.sid = sid;
          if (!o.first_source) o.first_source = first.s;
          if (!o.first_medium) o.first_medium = first.m;
          if (!o.first_campaign) o.first_campaign = first.c;
          if (!o.utm_source && u.utm_source) o.utm_source = u.utm_source;
          if (!o.utm_medium && u.utm_medium) o.utm_medium = u.utm_medium;
          return JSON.stringify(o);
        }
      } catch (e) {}
      return b;
    }
    window.fetch = function (input, init) {
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.indexOf(HOOK) !== -1 && init && typeof init.body === "string") {
          init = Object.assign({}, init, { body: enrich(init.body) });
        }
      } catch (e) {}
      return _f.apply(this, arguments.length > 1 ? [input, init] : [input]);
    };
  } catch (e) {}
})();
