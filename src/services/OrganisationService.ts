import { Service } from "typedi";
import { Organisation } from "../models/security/Organisation";
import axios from 'axios';
const usersApiDomain = process.env.USERS_API_URL;

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
