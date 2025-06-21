export function shortenUrl(url: string, maxLength = 40) {
    if (url.length <= maxLength) {
        return url;
    }

    try {
        const urlObject = new URL(url);
        const domain = urlObject.hostname.replace(/^www\./, '');
        
        const fullPath = (urlObject.pathname + urlObject.search).replace(/^\/|\/$/g, '');

        if (`${domain}/${fullPath}`.length <= maxLength) {
            return `${domain}/${fullPath}`;
        }
        
        const availableLength = maxLength - domain.length - 2; // for "/..."

        if (availableLength < 5) { // e.g. a...b
            return domain;
        }

        const startLength = Math.ceil(availableLength / 2);
        const endLength = Math.floor(availableLength / 2);

        const start = fullPath.substring(0, startLength);
        const end = fullPath.substring(fullPath.length - endLength);
        
        return `${domain}/${start}...${end}`;
    } catch (error) {
        // Fallback for non-URL strings
        const availableLength = maxLength - 3;
        const start = Math.ceil(availableLength / 2);
        const end = Math.floor(availableLength / 2);
        return `${url.substring(0, start)}...${url.substring(url.length - end)}`;
    }
} 
