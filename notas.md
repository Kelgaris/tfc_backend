## Los esquemas

En los esqumas tenemos que añadir los esquemas de:

    - personajes
    - monsters
    - inventory

Dichos esquemas tienes que tener los siguientes campos:

    - Esquema personajes:
        - _id: ObjectId()
        - nombre: str
        - imagen: str
        - atributos: Object
            - vit: num
            - fuerza: num
            - agi: num
            - ene: num
            - int: num
            - esp: num
            - ata: num
            - def: num
            - defm: num
            - atax: num
        - equipo: Object
            - arma: str
            - armadura: str
            - acesorio: str
        - expTotal: num
        - nivel: num

    -esquema monsters:
        - _id ObjectId()
        - img: str
        - nombre: str
        - vit: num
        - nivel: num
        - exp: num
        - guiles: num
        - fuerza: num
        - agi: num
        - ene: num
        - int: num
        - esp: num
        - ata: num
        - def: num
        - defm: num
        - atax: num

    - esquema inventory:
        - _id ObjectId()
        - nombre: str
        - descripcion: str
        - efecto: Object
            - tipo: str
            - atributo: str
            - porcentaje/valor: num
        - cantidad: num
        - compra: num
        - tipo: str (Consumible)
        - venta: num

    - esquema inventory
        - _id ObjectId
        - nombre: str
        - tipo: str (arma)
        - ataque: num
        - cantidad: num
        - compra: num
        - venta: num
    
    -esquema inventory
        - _id ObjectId
        - nombre: str
        - tipo: str (cuerpo)
        - defensa: num
        - defensam: num
        - cantidad: num
        - compra: num
        - venta: num