# auth

## Project setup
```
npm install
```

### RUN FRONT-END (in folder auth run these commands)
```
npm run serve
```

### RUN BACK-END (in folder auth run these commands)
```
npm run server
```

PROMJENE :

1. Autentikacija nesto ne radi,kaze da lozinka nije ista na Signupu.
2. Više nije Landing.vue sada je Home.vue
3. Više nije Signup.vue sada je Register.vue
4. Napravio sam neke sitne izmjene ono u index.html dodani su neki CDN-ns da mozže renderat bootstrap i ostalo.
5. Suklando sa promijenjenim imenima viewsa promijenjene su i nazivi ruta u router fileu.
6. Rute su sljedeće : / za home  /login za login i  /register za registraciju.
7. Kod koji nije radio za autentikaciju sam izbrisao ovo je čisto frontend.
8. Kod za autentikaciju je na branchu prije.
9. Folder za ulaz u app više nije auth nego project_wa.