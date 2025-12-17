-- 1. Identificar y borrar duplicados dejando solo el más reciente (o antiguo, da igual si no tienen productos asociados)
-- Esta consulta borra todas las etiquetas que tienen el mismo nombre y usuario, EXCEPTO la que tiene el ID más pequeño (la primera creada).

DELETE FROM product_tags a USING product_tags b
WHERE a.id > b.id
AND a.name = b.name
AND a.user_id = b.user_id;

-- 2. Ahora que ya no hay duplicados, intentamos aplicar la restricción de nuevo
ALTER TABLE product_tags
ADD CONSTRAINT unique_user_tag_name UNIQUE (user_id, name);
