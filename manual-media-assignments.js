(() => {
  const trip = window.TRIP_DATA;
  if (!trip) return;

  // Canonical manual assignment for media whose exported copy lost EXIF metadata.
  // This image matches the Library original IMG_4401.jpeg. The next iPhone image,
  // IMG_4402.JPG, is GPS-fixed at Bruksgården / Glava Glasbruk on 10 August 2026.
  // We therefore assign the image to Glava without inventing a timestamp or GPS point.
  const assignments = {
    '67ABBC03-B9D2-46F7-A3E8-C7A3937F64AC': {
      stopId: 'glava',
      filename: 'IMG_4401.jpeg'
    }
  };

  Object.entries(assignments).forEach(([id, correction]) => {
    const index = (trip.unlocatedMedia || []).findIndex(item => item.id === id);
    if (index < 0) return;

    const [item] = trip.unlocatedMedia.splice(index, 1);
    const stop = (trip.stops || []).find(candidate => candidate.id === correction.stopId);
    if (!stop) {
      trip.unlocatedMedia.splice(index, 0, item);
      return;
    }

    if (correction.filename) item.filename = correction.filename;
    stop.media = stop.media || [];
    if (!stop.media.some(existing => existing.id === id)) stop.media.push(item);
  });
})();
