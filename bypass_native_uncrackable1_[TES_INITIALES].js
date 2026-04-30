// bypass_native_uncrackable1_[TES_INITIALES].js
// Auteur : EZBIRI AMKIRA
// Hooks natifs adaptés après analyse frida-trace

const TAG_NAT = '[TP-NATIF-UC1]';

const CHEMINS_NATIFS = [
  '/system/bin/su',
  '/system/xbin/su',
  '/sbin/su',
  '/system/bin/busybox',
  '/system/xbin/busybox',
  '/proc/mounts',
  '/proc/self/mounts'
];

function estSujet(ptrChemin) {
  try {
    const p = ptrChemin.readCString();
    if (!p) return false;
    return CHEMINS_NATIFS.some(function (s) {
      return p === s || p.indexOf(s) !== -1;
    });
  } catch (_) { return false; }
}

function accrocherFonction(nom, indexArg) {
  try {
    Interceptor.attach(Module.getExportByName(null, nom), {
      onEnter: function (args) {
        const ptr = indexArg >= 0 ? args[indexArg] : null;
        if (ptr && estSujet(ptr)) {
          this.bloquer = true;
          this.chemin  = ptr.readCString();
        }
      },
      onLeave: function (retval) {
        if (this.bloquer) {
          console.log(TAG_NAT + ' ' + nom + ' bloqué : ' + this.chemin);
          retval.replace(ptr(-1));
        }
      }
    });
    console.log(TAG_NAT + ' Hook natif : ' + nom);
  } catch (e) {
    console.log(TAG_NAT + ' Impossible : ' + nom + ' — ' + e.message);
  }
}

accrocherFonction('open',   0);
accrocherFonction('openat', 1);
accrocherFonction('access', 0);
accrocherFonction('stat',   0);
accrocherFonction('lstat',  0);