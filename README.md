# TP 11 — Bypass de détection Root Android avec Frida

**Auteur : Amira EZBIRI**

---

## 1. Présentation

Ce TP a pour objectif de comprendre comment une application Android peut détecter un environnement rooté, puis de neutraliser cette détection à l’aide de Frida.

Le travail s’effectue sur une application de test pédagogique de type **root checker / UnCrackable**.  
L’approche est progressive :

1. vérification de l’environnement,
2. lancement de `frida-server`,
3. observation du comportement de l’application sans injection,
4. contournement côté Java,
5. contournement côté natif,
6. validation finale.

---

## 2. Objectifs pédagogiques

À la fin du TP, on doit être capable de :

- identifier les contrôles root les plus fréquents dans une application Android ;
- utiliser Frida pour intercepter les vérifications Java ;
- utiliser Frida pour bloquer certains appels natifs ;
- lancer une application sous Frida ;
- interpréter les logs pour vérifier que les hooks fonctionnent ;
- diagnostiquer les erreurs classiques de connexion ou d’injection.

---

## 3. Environnement utilisé

### Côté PC
- Frida installé
- Python avec le module `frida`
- Android Platform Tools (`adb`)
- Windows PowerShell, ou bash/zsh selon le système

### Côté Android
- appareil Android avec débogage USB activé
- `frida-server` correspondant exactement à la version Frida du PC
- application cible installée

### Application cible
Dans ce TP, la cible est une application de test pédagogique de type :
- `owasp.mstg.uncrackable1`

---

## 4. Vérifications initiales

Avant de commencer, il faut confirmer que les outils sont opérationnels.

### Commandes utiles
```bash
frida --version
python -c "import frida; print(frida.__version__)"
adb devices
```

### Résultat attendu
- `frida --version` affiche la version installée
- `python -c ...` affiche la même version côté module Python
- `adb devices` doit montrer un appareil en état `device`

Si l’appareil apparaît comme `unauthorized`, il faut valider la connexion USB sur le téléphone.

---

## 5. Mise en place de frida-server sur Android

### 5.1 Vérifier l’architecture de l’appareil
```bash
adb shell getprop ro.product.cpu.abi
```

Cette commande permet de connaître l’architecture exacte :
- `arm64-v8a`
- `armeabi-v7a`
- `x86`
- `x86_64`

### 5.2 Transférer frida-server
Après avoir téléchargé la version correcte de `frida-server`, il faut la pousser sur l’appareil :

```bash
adb push frida-server /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server
```

### 5.3 Lancer frida-server
```bash
adb shell "/data/local/tmp/frida-server -l 0.0.0.0"
```

Le terminal doit rester ouvert tant que le serveur fonctionne.

### 5.4 Vérification
```bash
frida-ps -Uai
```

Cette commande doit afficher les applications visibles sur l’appareil.

---

## 6. Comprendre la détection root

Les applications utilisent souvent plusieurs méthodes pour détecter un root.

### 6.1 Détection Java
Exemples fréquents :

- lecture de `android.os.Build.TAGS`
- test de présence des fichiers `su`
- appel à `Runtime.getRuntime().exec("su")`
- recherche de `busybox`
- utilisation de bibliothèques tierces comme RootBeer

### 6.2 Détection native
Certaines applications passent par du code natif et utilisent :

- `open`
- `openat`
- `access`
- `stat`
- `lstat`
- lecture de `/proc/mounts` ou `/proc/self/mounts`

---

## 7. Bypass côté Java

Le script Java fourni dans ce TP neutralise les contrôles classiques.

### Fichier utilisé
- `bypass_uncrackable1_Amira_EZBIRI.js`

### Rôle du script
Le script :
- intercepte `System.exit`
- intercepte `Runtime.exit`
- force `Build.TAGS` à `release-keys`
- bloque les vérifications de fichiers sensibles via `File.exists`
- filtre les appels `Runtime.exec` contenant `su` ou `busybox`

### Lancement
```bash
frida -U -f owasp.mstg.uncrackable1 -l bypass_uncrackable1_Amira_EZBIRI.js --no-pause
```

### Ce qu’on doit observer
- les hooks s’activent dans la console Frida ;
- l’application ne se ferme plus brutalement ;
- la détection root est affaiblie ou contournée.

---

## 8. Bypass côté natif

Quand la détection continue malgré le script Java, il faut bloquer les contrôles système de bas niveau.

### Fichier utilisé
- `bypass_native_uncrackable1_Amira_EZBIRI.js`

### Rôle du script
Le script natif bloque les accès sur les chemins sensibles suivants :

- `/system/bin/su`
- `/system/xbin/su`
- `/sbin/su`
- `/system/bin/busybox`
- `/system/xbin/busybox`
- `/proc/mounts`
- `/proc/self/mounts`

Les fonctions natives ciblées sont :

- `open`
- `openat`
- `access`
- `stat`
- `lstat`

### Lancement
```bash
frida -U -f owasp.mstg.uncrackable1 -l bypass_uncrackable1_Amira_EZBIRI.js -l bypass_native_uncrackable1_Amira_EZBIRI.js --no-pause
```

### Ce qu’on doit observer
- les messages du type `Hook natif : ...`
- puis `bloqué : ...` pour les chemins suspects
- la détection root est davantage neutralisée

---

## 9. Validation finale

La validation consiste à comparer l’exécution :

### Sans Frida
- l’application détecte le root ;
- elle affiche un message d’alerte ;
- elle peut se fermer ou bloquer l’accès.

### Avec Frida
- les hooks Java s’activent ;
- les appels natifs sensibles sont bloqués ;
- l’application continue à tourner normalement ;
- les logs affichent clairement les interceptions.

---

## 10. Captures intégrées dans le rapport

Les captures suivantes illustrent les étapes du TP :

1. vérification de l’environnement ;
2. repérage du package cible ;
3. lancement sans Frida ;
4. injection du script Java ;
5. résultat du bypass Java ;
6. traçage natif avec `frida-trace` ;
7. application du script natif ;
8. validation finale avec les deux scripts.

---

## 11. Structure des fichiers livrés

### Rapport
- `Rapport_TP11_Frida_Root_Bypass_Amira_EZBIRI.docx`
- `Rapport_TP11_Frida_Root_Bypass_Amira_EZBIRI.pdf`

### Scripts
- `bypass_uncrackable1_Amira_EZBIRI.js`
- `bypass_native_uncrackable1_Amira_EZBIRI.js`

### README
- `README_TP11_Frida_Root_Bypass_DETAILLE.md`

---

## 12. Utilisation rapide

### 12.1 Démarrer frida-server
```bash
adb shell "/data/local/tmp/frida-server -l 0.0.0.0"
```

### 12.2 Vérifier les appareils visibles
```bash
frida-ps -Uai
```

### 12.3 Lancer l’application avec les hooks
```bash
frida -U -f owasp.mstg.uncrackable1 -l bypass_uncrackable1_Amira_EZBIRI.js -l bypass_native_uncrackable1_Amira_EZBIRI.js --no-pause
```

---

## 13. Dépannage

### 13.1 `unable to connect to remote frida-server`
Vérifier :
- que l’appareil est bien détecté par `adb devices`
- que `frida-server` tourne réellement sur Android
- que la version de `frida-server` correspond à la version du client Frida

### 13.2 L’application se ferme tout de suite
Essayer :
- de lancer sans `--no-pause` dans un premier test ;
- puis d’ajouter les hooks un par un ;
- d’attacher après lancement avec `-n` si nécessaire.

### 13.3 Aucun log de hook
Vérifier :
- le bon nom du package ;
- la bonne architecture ;
- la présence de la console Frida ;
- que les scripts sont bien chargés.

### 13.4 Le script natif ne bloque rien
Utiliser `frida-trace` pour identifier les fonctions réellement utilisées par l’application, puis compléter la liste des chemins ou fonctions à bloquer.

---

## 14. Conclusion

Ce TP montre qu’une détection root Android peut être contournée en combinant :
- des hooks Java pour les vérifications classiques ;
- des hooks natifs pour les contrôles plus bas niveau.

L’approche est pédagogique, progressive et permet de comprendre comment les applications protègent leurs contrôles internes, ainsi que la manière dont Frida peut être utilisé pour les observer et les neutraliser dans un cadre autorisé.

---

## 15. Scripts fournis

### `bypass_uncrackable1_Amira_EZBIRI.js`
Script Java pour bloquer les contrôles root classiques et empêcher la fermeture de l’application.

### `bypass_native_uncrackable1_Amira_EZBIRI.js`
Script natif pour bloquer les appels système liés aux fichiers et chemins suspects.

---
## 15. Toutes les captures decrans necessaires:
<img width="628" height="67" alt="app sans Frida" src="https://github.com/user-attachments/assets/7a13bfa9-f71e-4ea6-a62a-81deab81a63e" />

<img width="1339" height="764" alt="Capture d&#39;écran 2026-04-30 113634" src="https://github.com/user-attachments/assets/d75b495b-fb7d-410c-9921-07c66b48f6a9" />

<img width="971" height="169" alt="Capture d&#39;écran 2026-04-30 113834" src="https://github.com/user-attachments/assets/10b4fd1c-e907-4d8a-889d-efd7a5c5f2b3" />

<img width="918" height="459" alt="Capture d&#39;écran 2026-04-30 120956" src="https://github.com/user-attachments/assets/efa8679a-7c3f-4a6c-a075-897a81879fe6" />

<img width="706" height="163" alt="Capture d&#39;écran 2026-04-30 125831" src="https://github.com/user-attachments/assets/1c791f25-0c58-4ee8-a98b-00b679bde4c1" />

<img width="959" height="477" alt="Capture d&#39;écran 2026-04-30 130031" src="https://github.com/user-attachments/assets/d9947ed5-d8ce-4090-b224-8c2f5e750d7d" />

<img width="808" height="326" alt="native" src="https://github.com/user-attachments/assets/ec16733a-8381-45e2-bffe-28e47dc1c773" />

<img width="959" height="505" alt="pcaeteblockeetjairunnertoutfor2ndtime" src="https://github.com/user-attachments/assets/d7a267d7-e85d-45df-8407-924398c6b0c7" />

<img width="959" height="503" alt="runfrida" src="https://github.com/user-attachments/assets/87701e2d-b5e2-4266-89a4-bd62984d4a86" />

<img width="959" height="507" alt="runscriptsfor2ndtime" src="https://github.com/user-attachments/assets/146e0ce5-ce3e-4ad5-b4a1-6f385c2b34c4" />

<img width="755" height="284" alt="verif" src="https://github.com/user-attachments/assets/ceba7d5b-547d-4b2e-be8a-cf1256a57712" />

<img width="869" height="402" alt="verif2ndtime" src="https://github.com/user-attachments/assets/d6cf68a9-27e8-4350-83ac-942950c2d932" />













