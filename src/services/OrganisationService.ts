import { Service } from "typedi";
import { Organisation } from "../models/security/Organisation";
import axios from 'axios';
// TODO move to env
const usersApiDomain = 'https://users-api-dev.worldsportaction.com';

@Service()
export default class OrganisationService {

    public async findOrganisationByUniqueKey(organisationKey: string, authToken: string): Promise<Organisation> {
        const response = await axios.get(
            `${usersApiDomain}/api/organisation-details?organisationUniqueKey=${organisationKey}`,
            {
                headers: {
                    'Authorization': authToken,
                }
            },
        );

        return response.data;
    }
}
