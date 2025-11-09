import { IsEnum, IsNotEmpty } from "class-validator";
import { GroupsUserRole } from "src/common/enums";

export class ChangeRoleDto {
    @IsNotEmpty()
    @IsEnum(GroupsUserRole)
    newRole: GroupsUserRole;
}
