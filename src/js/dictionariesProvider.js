const cache = {};

const getDictionary = (cacheKey, requestFn) => {
    // trying to get values from the cache
    if (cache[cacheKey]) {
        return cache[cacheKey].then ? cache[cacheKey] : Promise.resolve(cache[cacheKey]);
    }

    cache[cacheKey] = requestFn().then((data) => {
        cache[cacheKey] = data.result;

        return data.result;
    }).catch(() => {
        cache[cacheKey] = [];
    });

    return cache[cacheKey];
};

const dictionariesProvider = {
    infoSources: () => getDictionary('infoSources', getCandidateInfoSourcesRequest),
    jobFamilyGroups: () => getDictionary('jobFamilyGroups', getJobFamilyGroupsRequest),
    jobFamilies: (jobFamilyGroupId) => getDictionary(`jobFamilies_${jobFamilyGroupId}`, () => getJobFamiliesRequest(jobFamilyGroupId)),
    getJobProfiles: (jobFamilyGroupId, jobFamilyId) => {
        return getDictionary(
            `jobProfiles_${jobFamilyGroupId}_${jobFamilyId}`,
            () => getJobProfilesRequest(jobFamilyGroupId, jobFamilyId)
        );
    }
};
