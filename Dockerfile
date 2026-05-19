ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM $BUILD_FROM

# Abhängigkeiten
RUN apk add --no-cache \
    bash \
    curl \
    jq

# Addon-Skripte
COPY run.sh /usr/bin/run.sh
RUN chmod +x /usr/bin/run.sh

# SteelSeries Card-Datei
COPY steelseries-gauge-card.js /usr/share/steelseries-gauge-card.js

CMD ["/usr/bin/run.sh"]
