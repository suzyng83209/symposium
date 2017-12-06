import React from 'react';

export const isValidRoomId = roomId => {
    // only alphanumeric and dashes allowed
    if (!roomId) return true;
    return /^[A-zÀ-ÿ0-9|-]+$/.test(roomId);
};

export const searchToJSON = search => {
    var queryString = search.replace(/^\?/, '');
    var queryArray = queryString.split('&');
    var queryObject = queryArray.reduce((obj, query) => {
        var [key, value] = query.split('=');

        if (/^(true|false)$/.test(value)) {
            value = Boolean(value);
        }

        if (/^-?[0-9]+(\.[0-9]+)?$/.test(value)) {
            value = parseFloat(value);
        }

        obj[key] = value;
        return obj;
    }, {});
    return queryObject;
};

export const queryStringify = (data = {}) => {
    return (
        '?' +
        Object.keys(data)
            .map(key => `${key}=${JSON.stringify(data[key])}`)
            .join('&')
    );
};

export const withParams = Component => {
    const params = searchToJSON(window.location.search);
    return () => <Component params={params} />;
};

export const b64toBlob = (b64Data, fileName, contentType = '', sliceSize = 512) => {
    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i += 1) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, { type: contentType });
    blob.lastModifiedDate = new Date();
    blob.name = fileName || 'test';
    return blob;
};

export const createAudio = src => {
    var audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.controls = true;
    audio.volume = 1;
    audio.src = src;

    console.log(audio.controlsList);

    return audio;
}