// Adds "Dashboard" link to rclone web GUI sidebar.
// Drop into the web GUI build dir alongside index.html.
(function() {
  function inject() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav) return false;
    var ul = nav.querySelector('ul') || nav;
    if (ul.querySelector('.rcx-nav-link')) return true;
    var li = document.createElement('li');
    li.className = 'nav-item';
    var a = document.createElement('a');
    a.className = 'nav-link rcx-nav-link';
    a.href = '/rcx.html';
    a.innerHTML = '<i class="nav-icon cui-dashboard"></i> Dashboard';
    li.appendChild(a);
    var first = ul.firstChild;
    if (first) ul.insertBefore(li, first);
    else ul.appendChild(li);
    return true;
  }
  if (inject()) return;
  var obs = new MutationObserver(function() { if (inject()) obs.disconnect(); });
  obs.observe(document.body, {childList: true, subtree: true});
  setTimeout(function() { obs.disconnect(); }, 15000);
})();
