// bypass_uncrackable1_[TES_INITIALES].js
// Auteur  : EZBIRI AMIRA
// Cible   : owasp.mstg.uncrackable1
// Objectif: neutraliser la détection root + empêcher l'exit forcé

const TAG = "[TP-UNCRACKABLE1]";

// Chemins suspects ciblés par l'app
const CHEMINS_SUSPECTS = [
  "/system/bin/su",
  "/system/xbin/su",
  "/sbin/su",
  "/system/su",
  "/system/app/Superuser.apk",
  "/system/app/SuperSU.apk",
  "/system/bin/busybox",
  "/system/xbin/busybox",
  "/data/local/bin/su",
  "/data/local/xbin/su"
];

function contientMotSujet(chaine, motif) {
  try {
    return (chaine || "").toLowerCase().indexOf((motif || "").toLowerCase()) !== -1;
  } catch (_) { return false; }
}

Java.perform(function () {

  // ── HOOK CRITIQUE : System.exit ─────────────────────────────────
  // Sans ce hook, l'alerte "Root detected" ferme l'app peu importe
  // ce qu'on fait sur les autres checks
  try {
    const System = Java.use('java.lang.System');
    System.exit.implementation = function (code) {
      console.log(TAG + ' System.exit(' + code + ') intercepté et neutralisé !');
      // On ne fait RIEN → l'app continue de tourner
    };
    console.log(TAG + ' Hook actif : System.exit');
  } catch (e) {
    console.log(TAG + ' ECHEC System.exit : ' + e.message);
  }

  // ── HOOK CRITIQUE : Runtime.exit (alternative utilisée parfois) ─
  try {
    const Runtime = Java.use('java.lang.Runtime');
    Runtime.exit.implementation = function (code) {
      console.log(TAG + ' Runtime.exit(' + code + ') intercepté et neutralisé !');
    };
    console.log(TAG + ' Hook actif : Runtime.exit');
  } catch (e) {
    console.log(TAG + ' ECHEC Runtime.exit : ' + e.message);
  }

  // ── HOOK 1 : Build.TAGS ─────────────────────────────────────────
  try {
    const Build = Java.use('android.os.Build');
    Object.defineProperty(Build, 'TAGS', {
      get: function () { return 'release-keys'; }
    });
    console.log(TAG + ' Hook actif : Build.TAGS => release-keys');
  } catch (e) {
    console.log(TAG + ' ECHEC Build.TAGS : ' + e.message);
  }

  // ── HOOK 2 : File.exists ────────────────────────────────────────
  try {
    const File = Java.use('java.io.File');
    File.exists.implementation = function () {
      const chemin = this.getAbsolutePath();
      if (CHEMINS_SUSPECTS.indexOf(chemin) !== -1) {
        console.log(TAG + ' File.exists bloqué : ' + chemin);
        return false;
      }
      return this.exists.call(this);
    };
    console.log(TAG + ' Hook actif : File.exists');
  } catch (e) {
    console.log(TAG + ' ECHEC File.exists : ' + e.message);
  }

  // ── HOOK 3 : Runtime.exec ───────────────────────────────────────
  try {
    const RuntimeExec = Java.use('java.lang.Runtime');
    const JString     = Java.use('java.lang.String');
    const JSArray     = Java.use('[Ljava.lang.String;');

    function doitBloquer(cmdOuTab) {
      const texte = Array.isArray(cmdOuTab)
        ? cmdOuTab.join(' ')
        : ('' + cmdOuTab);
      return (
        contientMotSujet(texte, ' su') ||
        texte.trim().toLowerCase() === 'su' ||
        contientMotSujet(texte, 'which su') ||
        contientMotSujet(texte, 'busybox')
      );
    }

    function tableauInnocent(cmds) {
      const a = JSArray.$new(cmds.length);
      cmds.forEach(function (s, i) { a[i] = JString.$new(s); });
      return a;
    }

    RuntimeExec.exec.overload('java.lang.String').implementation = function (cmd) {
      if (doitBloquer(cmd)) {
        console.log(TAG + ' Runtime.exec bloqué : ' + cmd);
        return this.exec(JString.$new('echo ok'));
      }
      return this.exec(cmd);
    };

    RuntimeExec.exec.overload('[Ljava.lang.String;').implementation = function (arr) {
      const js = arr ? Array.from(arr) : [];
      if (doitBloquer(js)) {
        console.log(TAG + ' Runtime.exec bloqué (tableau) : ' + js.join(' '));
        return this.exec(tableauInnocent(['sh', '-c', 'echo ok']));
      }
      return this.exec(arr);
    };

    RuntimeExec.exec.overload('java.lang.String', '[Ljava.lang.String;').implementation = function (cmd, envp) {
      if (doitBloquer(cmd)) {
        console.log(TAG + ' Runtime.exec bloqué (String+env) : ' + cmd);
        return this.exec(JString.$new('echo ok'), envp);
      }
      return this.exec(cmd, envp);
    };

    RuntimeExec.exec.overload('[Ljava.lang.String;', '[Ljava.lang.String;').implementation = function (arr, envp) {
      const js = arr ? Array.from(arr) : [];
      if (doitBloquer(js)) {
        console.log(TAG + ' Runtime.exec bloqué (tab+env) : ' + js.join(' '));
        return this.exec(tableauInnocent(['sh', '-c', 'echo ok']), envp);
      }
      return this.exec(arr, envp);
    };

    console.log(TAG + ' Hooks Runtime.exec installés (4 surcharges)');
  } catch (e) {
    console.log(TAG + ' ECHEC Runtime.exec : ' + e.message);
  }

  console.log(TAG + ' === Tous les hooks sont actifs — UnCrackable1 ===');
});