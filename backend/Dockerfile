FROM php:8.3-cli

RUN apt-get update && apt-get install -y \
    unzip git curl libpng-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring bcmath opcache \
    && rm -rf /var/lib/apt/lists/*

# OPcache : évite de relire/recompiler le code PHP à chaque requête.
# Décisif ici car ./backend est monté en bind mount Windows (I/O lente) —
# revalidate_freq=2 espace les vérifications de fichiers modifiés au lieu
# de les faire à chaque requête, tout en gardant le rechargement à chaud
# pour le développement (pas besoin de rebuild pour voir un changement).
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.enable_cli=0'; \
    echo 'opcache.memory_consumption=192'; \
    echo 'opcache.max_accelerated_files=20000'; \
    echo 'opcache.validate_timestamps=1'; \
    echo 'opcache.revalidate_freq=2'; \
    } > /usr/local/etc/php/conf.d/opcache-recommended.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN composer install --no-interaction --prefer-dist --optimize-autoloader

RUN php artisan storage:link || true

EXPOSE 8000
